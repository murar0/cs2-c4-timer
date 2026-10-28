/**
 * Ulanzi C4 Timer (CS2) : serviço principal (Node.js, roda dentro do Ulanzi Studio)
 *
 * Fluxo:
 *   CS2 --POST JSON--> servidor GSI local (gsi.js) --> C4Tracker
 *   loop a cada 25ms --> GIF (contagem, lados, explosão) ou PNG --> tecla
 *
 * Quase tudo vai para o deck como GIF, que o próprio aparelho anima. Assim a
 * tecla recebe uma imagem só por evento (plant, defuse, fim) e não pisca.
 */
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

import { UlanziApi } from "./ulanzi-api/index.js";
import { C4Tracker, startGsiServer } from "./gsi.js";
import { renderFrame, countdownFrames, meteorFrames } from "./render.js";
import { KEY, METEOR_FRAMES, METEOR_DELAY } from "./art.js";
import { encodeGif } from "./gif.js";
import { installCfg, buildCfg, readInstalledToken, CFG_NAME } from "./cfgInstaller.js";

const PLUGIN_UUID = "com.ulanzi.ulanzistudio.cs2c4";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------- configuração ----------------
const CONFIG_FILE = path.join(ROOT, "config.json");
const config = { gsiPort: 30731, gsiToken: "", debugLog: true };
try {
  Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")));
} catch (e) {
  console.warn("config.json não encontrado, usando padrões", e.message);
}
// Cada instalação tem a própria senha entre o CS2 e o plugin. Se já existe um
// .cfg nosso no CS2 (atualização de versão), reaproveita a senha dele para
// não precisar reinstalar; senão, cria uma nova.
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
  } catch (e) {
    console.warn("não consegui salvar o config.json", e.message);
  }
}
const tokenReady = config.gsiToken
  ? Promise.resolve()
  : readInstalledToken()
      .catch(() => null)
      .then((found) => {
        config.gsiToken = found || "c4-" + crypto.randomBytes(9).toString("hex");
        saveConfig();
      });

// ---------------- log de diagnóstico ----------------
const LOG_FILE = path.join(ROOT, "logs", "c4-debug.log");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (!config.debugLog) return;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 256 * 1024) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".old");
    }
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {
    /* log é opcional */
  }
}

// ---------------- estado ----------------
const DEFAULTS = { layout: "auto", marginSec: 0.3, offsetSec: 0, precision: "int", forceSide: "" };

/**
 * Animações GIF: o próprio deck toca o GIF, então não há envio de imagens a
 * cada quadro. Se o arquivo não existir, o plugin usa uma imagem fixa.
 *   {t|ct}_{single|left|right}.gif      tela do seu lado antes do plant
 *   boom_{single|left|right}.gif        explosão
 *   defuse_{single|left|right}.gif      bomba defusada
 *   boomdemo_{single|left|right}.gif    explosão da simulação (com a isca)
 */
const gifCache = new Map(); // caminho -> { exists, checkedAt }
function animGif(name, layout) {
  const rel = `assets/anim/${name}_${layout}.gif`;
  const now = Date.now();
  const hit = gifCache.get(rel);
  if (hit && now - hit.checkedAt < 5000) return hit.exists ? rel : null;
  const exists = fs.existsSync(path.join(ROOT, rel));
  gifCache.set(rel, { exists, checkedAt: now });
  return exists ? rel : null;
}
const instances = {}; // context -> { settings, active, lastSvg, key }
const tracker = new C4Tracker(() => performance.now(), log);
const demo = new C4Tracker(() => performance.now(), () => {}, { endDisplayMs: 5600 });
let demoActive = false;
let serverStatus = { ok: false, msg: "iniciando" };
let lastFieldsReport = "";

function parseSettings(param = {}) {
  const s = { ...DEFAULTS };
  if (["auto", "single", "left", "right"].includes(param.layout)) s.layout = param.layout;
  const m = parseFloat(param.marginSec);
  if (Number.isFinite(m) && m >= 0 && m <= 3) s.marginSec = m;
  const o = parseFloat(param.offsetSec);
  if (Number.isFinite(o) && o >= -5 && o <= 5) s.offsetSec = o;
  if (["int", "half", "tenth"].includes(param.precision)) s.precision = param.precision;
  if (["", "T", "CT"].includes(param.forceSide)) s.forceSide = param.forceSide;
  return s;
}

function ensure(context) {
  if (!instances[context]) {
    const key = $UD.decodeContext(context).key || "";
    instances[context] = { settings: { ...DEFAULTS }, active: true, lastSvg: "", key };
    log(`tecla adicionada: ${key}`);
  }
  return instances[context];
}

/**
 * Define o layout real de cada tecla.
 * "auto": se houver outra tecla "auto" vizinha na mesma linha, as duas viram
 * uma tecla larga (a da esquerda mostra o número, a da direita o aviso).
 * Sozinha, vira 1 tecla. As chaves do Ulanzi Studio vêm como "coluna_linha".
 */
function effectiveLayouts() {
  const out = {};
  const autos = [];
  for (const [ctx, inst] of Object.entries(instances)) {
    out[ctx] = inst.settings.layout === "auto" ? "single" : inst.settings.layout;
    const m = /^(\d+)_(\d+)$/.exec(inst.key);
    if (inst.settings.layout === "auto" && m) autos.push({ ctx, col: +m[1], row: +m[2] });
  }
  autos.sort((a, b) => a.row - b.row || a.col - b.col);
  const used = new Set();
  for (let i = 0; i < autos.length - 1; i++) {
    const a = autos[i];
    const b = autos[i + 1];
    if (used.has(a.ctx) || a.row !== b.row || b.col !== a.col + 1) continue;
    out[a.ctx] = "left";
    out[b.ctx] = "right";
    used.add(a.ctx).add(b.ctx);
  }
  return out;
}

// ---------------- GIFs gerados na hora ----------------
// Contagem e estrela cadente são desenhadas pelo plugin e gravadas em assets/cache.
const CACHE_DIR = path.join(ROOT, "assets", "cache");
try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const f of fs.readdirSync(CACHE_DIR)) if (f.endsWith(".gif")) fs.unlinkSync(path.join(CACHE_DIR, f));
} catch (e) {
  log("cache indisponível: " + e.message);
}

/** Grava o GIF de 1 tecla ou as duas metades da tecla larga. */
function writeGifs(name, { frames, delays }, wide, loop) {
  const save = (file, fr) => {
    fs.writeFileSync(path.join(CACHE_DIR, file), encodeGif(fr, delays, loop));
    return `assets/cache/${file}`;
  };
  if (!wide) return { single: save(`${name}_single.gif`, frames) };
  return {
    left: save(`${name}_left.gif`, frames.map((f) => f.crop(0, 0, KEY, KEY))),
    right: save(`${name}_right.gif`, frames.map((f) => f.crop(KEY, 0, KEY, KEY))),
  };
}

// --- contagem da C4 como GIF ---
// Gerada no plant e de novo só se algo mudar (defuse, kit, ou o jogo corrigir
// o tempo em mais de RESYNC_MS).
const RESYNC_MS = 300;
const DEVICE_LATENCY_MS = 80; // tempo estimado até o deck começar a tocar
let cd = null; // { sig, fixed, explodeAt, seq, variants }
let cdSeq = 0;
let encodeEstimateMs = 150;

function updateCountdownPlan(snap, now) {
  if (snap.phase !== "planted" || snap.remaining === null) {
    cd = null;
    return;
  }
  const fixed = {
    defusing: !!snap.defusing,
    defuseOk: snap.defuseRemaining !== null && snap.defuseRemaining <= snap.remaining,
    myKit: snap.hasKit && snap.team === "CT",
  };
  const sig = JSON.stringify(fixed);
  const explodeAt = now + snap.remaining * 1000;
  const drift = cd ? Math.abs(cd.explodeAt - explodeAt) : 0;
  if (!cd || cd.sig !== sig || (snap.remaining > 0.5 && drift > RESYNC_MS)) {
    cd = { sig, fixed, explodeAt, seq: ++cdSeq, variants: new Map() };
    try {
      for (const f of fs.readdirSync(CACHE_DIR)) {
        const m = /^cd(\d+)_/.exec(f);
        if (m && +m[1] < cdSeq - 1) fs.unlinkSync(path.join(CACHE_DIR, f));
      }
    } catch {
      /* limpeza é opcional */
    }
  }
}

function countdownGif(settings, layout) {
  const wide = layout !== "single";
  const vkey = `${wide}|${settings.marginSec}|${settings.precision}`;
  if (!cd.variants.has(vkey)) {
    let v = null;
    const t0 = performance.now();
    try {
      const r0 = Math.max(0, (cd.explodeAt - t0 - encodeEstimateMs - DEVICE_LATENCY_MS) / 1000);
      v = writeGifs(`cd${cd.seq}_${cd.variants.size}`, countdownFrames(wide ? KEY * 2 : KEY, r0, settings, cd.fixed), wide, false);
      const took = performance.now() - t0;
      encodeEstimateMs = encodeEstimateMs * 0.6 + took * 0.4;
    } catch (e) {
      log("erro ao gerar a contagem em GIF, usando imagens: " + e.message);
    }
    cd.variants.set(vkey, v);
  }
  const v = cd.variants.get(vkey);
  return v ? v[layout] : null;
}

// --- estrela cadente nas telas de espera, a cada 4 a 6 minutos ---
const meteorCache = new Map();
const meteorInterval = () => (4 + Math.random() * 2) * 60000;
let nextMeteorAt = performance.now() + meteorInterval();
let meteorUntil = 0;

function meteorGif(kind, layout) {
  const wide = layout !== "single";
  const k = `${kind}|${wide}`;
  if (!meteorCache.has(k)) {
    let v = null;
    try {
      v = writeGifs(`meteor_${kind}_${wide ? "w" : "s"}`, meteorFrames(kind, wide ? KEY * 2 : KEY), wide, true);
    } catch (e) {
      log("erro ao gerar a estrela cadente: " + e.message);
    }
    meteorCache.set(k, v);
  }
  const v = meteorCache.get(k);
  return v ? v[layout] : null;
}

function anySettings() {
  const first = Object.values(instances)[0];
  return first ? first.settings : DEFAULTS;
}

// ---------------- servidor GSI ----------------
startGsiServer({
  port: config.gsiPort,
  token: () => config.gsiToken,
  onPayload: (data) => {
    // registra uma vez quais blocos o CS2 está mandando (ajuda a calibrar)
    const fields = Object.keys(data).sort().join(",");
    const pcPhase = data.phase_countdowns ? data.phase_countdowns.phase : "-";
    if (data.round && data.round.bomb === "planted") {
      const rep = `campos no plant: ${fields} | phase_countdowns.phase=${pcPhase} | bomb=${data.bomb ? JSON.stringify(data.bomb) : "-"}`;
      if (rep !== lastFieldsReport) {
        lastFieldsReport = rep;
        log(rep);
      }
    }
    tracker.ingest(data, { offsetSec: anySettings().offsetSec });
  },
  onError: (e) => {
    serverStatus = { ok: false, msg: `porta ${config.gsiPort} indisponível (${e.code || e.message})` };
    log("ERRO no servidor GSI: " + serverStatus.msg);
  },
});
serverStatus = { ok: true, msg: `ouvindo em 127.0.0.1:${config.gsiPort}` };
log(`Ulanzi C4 Timer iniciado, ${serverStatus.msg}`);

// ---------------- Ulanzi Studio ----------------
const $UD = new UlanziApi();
$UD.connect(PLUGIN_UUID);

$UD.onConnected(() => log("conectado ao Ulanzi Studio"));

$UD.onAdd((jsn) => {
  const inst = ensure(jsn.context);
  if (jsn.param && Object.keys(jsn.param).length) inst.settings = parseSettings(jsn.param);
  inst.lastSvg = "";
});

function onSettings(jsn) {
  const inst = ensure(jsn.context);
  inst.settings = parseSettings(jsn.param || {});
  inst.lastSvg = "";
}
$UD.onParamFromApp(onSettings);
$UD.onParamFromPlugin(onSettings);

$UD.onSetActive((jsn) => {
  const inst = ensure(jsn.context);
  inst.active = String(jsn.active) === "true";
  inst.lastSvg = "";
});

$UD.onClear((jsn) => {
  for (const item of jsn.param || []) delete instances[item.context];
});

function toggleDemo() {
  if (demoActive) {
    demoActive = false;
  } else {
    demo.simulatePlant(40);
    demoActive = true;
  }
}

// apertar a tecla liga/desliga uma simulação de 40s (para testar sem o jogo)
$UD.onRun(() => toggleDemo());

$UD.onSendToPlugin(async (jsn) => {
  const payload = jsn.payload || jsn.param || {};
  if (payload.cmd === "demo") toggleDemo();
  if (payload.cmd === "meteor") nextMeteorAt = 0;
  if (payload.cmd === "installCfg") {
    let result;
    try {
      await tokenReady;
      result = await installCfg(config.gsiPort, config.gsiToken);
    } catch (e) {
      result = { ok: false, error: e.message };
    }
    log("instalação do cfg: " + JSON.stringify(result));
    $UD.sendToPropertyInspector({ type: "installResult", ...result }, jsn.context);
  }
  if (payload.cmd === "showCfg") {
    await tokenReady;
    $UD.sendToPropertyInspector(
      { type: "cfgText", name: CFG_NAME, text: buildCfg(config.gsiPort, config.gsiToken) },
      jsn.context
    );
  }
});

// ---------------- loop de desenho ----------------
// Cada troca de imagem vira um pacote USB que o D200 precisa abrir e
// redesenhar, e isso pisca. Por isso:
//   - a contagem vai inteira num GIF só, tocado pelo próprio deck;
//   - todas as teclas são calculadas no mesmo instante e enviadas juntas
//     (as duas metades da tecla larga começam no mesmo momento);
//   - um envio a cada 250ms no máximo, e só quando algo visível mudou.
const MIN_SEND_INTERVAL = 250;
let lastSendAt = 0;
let lastLayoutsKey = "";

setInterval(() => {
  tracker.tick();
  demo.tick();
  if (demoActive && demo.phase === "idle") demoActive = false;

  const now = performance.now();
  if (now - lastSendAt < MIN_SEND_INTERVAL) return;

  const snap = demoActive ? { ...demo.snapshot(), connected: true } : tracker.snapshot();
  const layouts = effectiveLayouts();
  const layoutsKey = JSON.stringify(layouts);
  if (layoutsKey !== lastLayoutsKey) {
    lastLayoutsKey = layoutsKey;
    log("layouts: " + Object.entries(layouts).map(([c, l]) => `${instances[c].key}=${l}`).join(", "));
  }

  const idle = snap.phase === "idle";
  updateCountdownPlan(snap, now);
  if (idle && now >= nextMeteorAt) {
    meteorUntil = now + METEOR_FRAMES * METEOR_DELAY;
    nextMeteorAt = now + meteorInterval();
  }

  // O que cada tecla deve mostrar: um GIF (contagem, lado, explosão, defuse,
  // estrela cadente) ou, se algo falhar, uma imagem PNG desenhada na hora
  const frameFor = (inst, layout) => {
    if (snap.phase === "ended") {
      const name = snap.result === "defused" ? "defuse" : demoActive ? "boomdemo" : "boom";
      const gif = animGif(name, layout);
      if (gif) return "gif:" + gif;
    }
    if (cd) {
      const gif = countdownGif(inst.settings, layout);
      if (gif) return "gif:" + gif;
    }
    if (idle) {
      const side = inst.settings.forceSide || (snap.connected ? snap.team : "");
      const kind = side === "T" || side === "CT" ? side : snap.connected ? "on" : "off";
      if (now < meteorUntil) {
        const gif = meteorGif(kind, layout);
        if (gif) return "gif:" + gif;
      }
      if (kind === "T" || kind === "CT") {
        const gif = animGif(kind.toLowerCase(), layout);
        if (gif) return "gif:" + gif;
      }
    }
    return renderFrame(snap, { ...inst.settings, layout });
  };

  const updates = [];
  for (const [context, inst] of Object.entries(instances)) {
    if (!inst.active) continue;
    const frame = frameFor(inst, layouts[context]);
    if (frame !== inst.lastSvg) updates.push([context, inst, frame]);
  }
  if (!updates.length) return;

  // tecla larga: se uma metade mudou, manda as duas juntas
  for (const [context, inst] of Object.entries(instances)) {
    const l = layouts[context];
    if (!inst.active || (l !== "left" && l !== "right")) continue;
    if (updates.some((u) => u[0] === context)) continue;
    if (updates.some((u) => layouts[u[0]] === "left" || layouts[u[0]] === "right")) {
      updates.push([context, inst, frameFor(inst, l)]);
    }
  }

  lastSendAt = now;
  for (const [context, inst, frame] of updates) {
    inst.lastSvg = frame;
    if (frame.startsWith("gif:")) $UD.setGifPathIcon(context, frame.slice(4), "");
    else $UD.setBaseDataIcon(context, frame, "");
  }
}, 25);

// status para o painel de configuração (1x por segundo)
setInterval(() => {
  const snap = tracker.snapshot();
  const status = {
    type: "status",
    server: serverStatus,
    connected: snap.connected,
    lastPayloadAgoMs: snap.lastPayloadAgoMs,
    phase: demoActive ? "demo" : snap.phase,
    source: snap.source,
    hasKit: snap.hasKit,
    team: snap.team,
  };
  for (const context of Object.keys(instances)) $UD.sendToPropertyInspector(status, context);
}, 1000);
