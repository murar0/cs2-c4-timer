/**
 * Monta a imagem de cada tecla a partir da arte 8-bit (art.js) e entrega
 * como PNG. PNG de pixel art fica nítido no deck e não depende do leitor de
 * SVG do Ulanzi Studio (que ignorava parte do SVG e quebrava a tecla larga).
 *
 * Layouts:
 *   single : 1 tecla
 *   left   : metade esquerda da tecla larga (2 teclas lado a lado)
 *   right  : metade direita da tecla larga
 */
import { DEFUSE_NO_KIT, DEFUSE_KIT } from "./gsi.js";
import { KEY, SCALE, sceneCountdown, sceneIdle, sceneSide, sceneBoom, sceneDefuse, drawMeteor, BOOM_DELAYS, DEFUSE_DELAYS, METEOR_FRAMES, METEOR_DELAY } from "./art.js";
import { pngDataUrl } from "./png.js";

/** Qual faixa de tempo estamos, considerando a margem de segurança. */
export function zoneFor(remaining, marginSec) {
  const r = remaining - marginSec;
  if (r >= DEFUSE_NO_KIT) return "green";
  if (r >= DEFUSE_KIT) return "amber";
  return "red";
}

/**
 * Arredonda o tempo para o que realmente aparece na tela. A imagem só muda
 * (e só é reenviada ao deck) quando algo visível muda.
 *   int   : segundos inteiros sempre (1 envio por segundo)
 *   half  : meio segundo abaixo de 10s
 *   tenth : 0,2s abaixo de 10s
 */
export function quantize(r, mode) {
  if (r >= 10 || mode === "int") return Math.floor(r);
  if (mode === "half") return Math.floor(r * 2) / 2;
  return Math.floor(r * 5) / 5;
}

function formatTime(rq, mode) {
  if (rq >= 10 || mode === "int") return String(rq);
  return rq.toFixed(1);
}

function cut(cv, layout) {
  if (layout === "left") return cv.crop(0, 0, KEY, KEY);
  if (layout === "right") return cv.crop(KEY, 0, KEY, KEY);
  return cv;
}

/** Desenho (Canvas) do estado atual para o layout pedido. */
export function sceneFor(snap, settings) {
  const layout = settings.layout || "single";
  const W = layout === "left" || layout === "right" ? KEY * 2 : KEY;
  const idle = snap.phase === "idle" || (snap.remaining === null && snap.phase !== "ended");

  if (idle) {
    const side = settings.forceSide || (snap.connected ? snap.team : "");
    if (side === "T" || side === "CT") return cut(sceneSide(side, W, 0), layout);
    return cut(sceneIdle(W, snap.connected), layout);
  }
  if (snap.phase === "ended") {
    // normalmente o deck toca o GIF; isto é só a imagem final de reserva
    const cv = snap.result === "defused" ? sceneDefuse(W, DEFUSE_DELAYS.length - 1) : sceneBoom(W, BOOM_DELAYS.length - 1);
    return cut(cv, layout);
  }

  const zone = zoneFor(snap.remaining, settings.marginSec);
  const rq = quantize(snap.remaining, settings.precision);
  const cv = sceneCountdown(W, {
    zone,
    myKit: snap.hasKit && snap.team === "CT",
    timeStr: formatTime(rq, settings.precision),
    remaining: snap.remaining,
  });
  return cut(cv, layout);
}

/** Imagem pronta (data URL PNG) para o setBaseDataIcon. */
export function renderFrame(snap, settings) {
  return pngDataUrl(sceneFor(snap, settings), SCALE);
}

/**
 * Quadros da contagem inteira, a partir de agora (r0 segundos restantes),
 * para virar um GIF que o próprio deck toca. Um quadro novo só começa quando
 * algo visível muda (número, cor ou barra). O último quadro ("0") fica parado
 * até a explosão chegar.
 *   W: 49 (1 tecla) ou 98 (tecla larga)
 *   fixed: { myKit }
 */
export function countdownFrames(W, r0, settings, fixed) {
  const segs = [];
  let prevKey = null;
  const steps = Math.max(0, Math.ceil(r0 * 100));
  for (let i = 0; i <= steps; i++) {
    const t = i / 100;
    const r = Math.max(0, r0 - t);
    const zone = zoneFor(r, settings.marginSec);
    const timeStr = formatTime(quantize(r, settings.precision), settings.precision);
    const key = `${zone}|${timeStr}`; // a barra anda junto com o número
    if (key !== prevKey) {
      segs.push({ t, r, zone, timeStr });
      prevKey = key;
    }
  }
  // tempos acumulados arredondados (sem acumular erro de arredondamento)
  const startCs = segs.map((s) => Math.round(s.t * 100));
  const delays = segs.map((_, i) => (i < segs.length - 1 ? (startCs[i + 1] - startCs[i]) * 10 : 60000));
  const frames = segs.map((s) =>
    sceneCountdown(W, { ...fixed, zone: s.zone, timeStr: s.timeStr, remaining: Math.ceil(s.r - 1e-6) })
  );
  // quadro de duração zero (dois cortes no mesmo centésimo) é descartado
  const keep = delays.map((d) => d > 0);
  return { frames: frames.filter((_, i) => keep[i]), delays: delays.filter((_, i) => keep[i]) };
}

/** Quadros da estrela cadente para a tela de espera de cada tipo. */
export function meteorFrames(kind, W) {
  const frames = [];
  for (let f = 0; f < METEOR_FRAMES; f++) {
    const deco = (cv) => drawMeteor(cv, f);
    frames.push(kind === "T" || kind === "CT" ? sceneSide(kind, W, f % 8, deco) : sceneIdle(W, kind === "on", deco));
  }
  return { frames, delays: new Array(METEOR_FRAMES).fill(METEOR_DELAY) };
}
