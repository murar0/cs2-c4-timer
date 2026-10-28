/**
 * Integração com o Counter-Strike 2 (Game State Integration oficial da Valve).
 *
 * O CS2 lê o arquivo gamestate_integration_ulanzi_c4.cfg na pasta cfg do jogo
 * e passa a mandar um POST com JSON para http://127.0.0.1:<porta> sempre que
 * o estado do jogo muda. Este módulo:
 *   1. sobe o servidor HTTP local que recebe esses POSTs;
 *   2. transforma os dados em um cronômetro da C4 (C4Tracker).
 *
 * De onde vem o tempo da C4 (em ordem de prioridade):
 *   a) phase_countdowns.phase === "bomb"  -> phase_ends_in é o tempo exato que falta
 *   b) bomb.countdown (enviado quando você está morto/espectando/GOTV)
 *   c) round.bomb === "planted"          -> começa 40s no momento em que chegou
 * Quando chega uma fonte melhor, o cronômetro se ressincroniza sozinho.
 */
import http from "http";

export const BOMB_TIME = 40; // segundos (Premier/Competitivo, mp_c4timer padrão)
export const DEFUSE_NO_KIT = 10;
export const DEFUSE_KIT = 5;

const SOURCE_RANK = { round: 1, bomb: 2, phase_countdowns: 3, demo: 4 };
const END_DISPLAY_MS = 4500; // duração da animação de explosão/defuse na tela

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export class C4Tracker {
  constructor(now = () => performance.now(), log = () => {}, { endDisplayMs = END_DISPLAY_MS } = {}) {
    this.now = now;
    this.log = log;
    this.endDisplayMs = endDisplayMs;
    this.lastPayloadAt = null;
    this.hasKit = false;
    this.team = "";
    this.roundNumber = null;
    this.reset("init");
  }

  reset(reason) {
    if (this.phase && this.phase !== "idle") this.log(`reset (${reason})`);
    this.phase = "idle"; // idle | planted | ended
    this.explodeAt = null;
    this.source = null;
    this.result = null; // defused | exploded
    this.endedAt = null;
    this.roundLocked = false; // impede rearmar com dado velho depois do fim
    this.lastEndsIn = {}; // último valor recebido por fonte (para ignorar repetidos)
    this.stats = { payloads: 0, repeated: 0, samples: 0, corrections: 0, ignoredLate: 0, maxLateMs: 0 };
  }

  /** Converte "tempo que falta" em horário de explosão, ignorando valor repetido. */
  _exactSample(src, endsIn, t, offsetSec) {
    if (this.phase === "planted" && this.lastEndsIn[src] === endsIn) {
      this.stats.repeated++;
      return;
    }
    this.lastEndsIn[src] = endsIn;
    this._setExplodeAt(t + endsIn * 1000, src, offsetSec);
  }

  setTeam(team) {
    if (team === this.team) return;
    this.log(team ? `seu lado agora: ${team === "T" ? "TR" : "CT"}` : "fora de partida, lado apagado");
    this.team = team;
  }

  /** Simula um plant (tecla pressionada / botão "Simular" no painel). */
  simulatePlant(seconds = BOMB_TIME) {
    this.reset("demo");
    this.phase = "planted";
    this.explodeAt = this.now() + seconds * 1000;
    this.source = "demo";
  }

  _setExplodeAt(at, src, offsetSec) {
    if (this.roundLocked || this.phase === "ended") return;
    if (src === "round") at -= offsetSec * 1000;

    if (this.phase !== "planted") {
      this.phase = "planted";
      this.explodeAt = at;
      this.source = src;
      const rem = (at - this.now()) / 1000;
      this.log(`C4 plantada detectada via "${src}", faltando ${rem.toFixed(2)}s`);
      return;
    }
    if (SOURCE_RANK[src] < SOURCE_RANK[this.source]) return;
    const delta = at - this.explodeAt;

    // Fonte melhor que a atual (ex.: estimativa -> tempo exato): troca direto.
    if (SOURCE_RANK[src] > SOURCE_RANK[this.source]) {
      this.log(`fonte trocada para "${src}" (${(delta / 1000).toFixed(2)}s de ajuste)`);
      this.explodeAt = at;
      this.source = src;
      return;
    }

    // Mesma fonte: o horário da explosão nunca é adiado.
    // Um valor que chega atrasado pela rede, ou repetido pelo jogo, sempre
    // aponta para uma explosão MAIS TARDE do que a real. Por isso só aceitamos
    // correções que antecipam a explosão. Isso elimina o "volta e acelera".
    this.stats.samples++;
    if (delta < 0) {
      if (delta < -150) this.log(`ressincronizado via "${src}" (${(delta / 1000).toFixed(2)}s)`);
      this.explodeAt = at;
      this.stats.corrections++;
    } else {
      this.stats.ignoredLate++;
      this.stats.maxLateMs = Math.max(this.stats.maxLateMs, delta);
    }
  }

  _end(result) {
    if (this.phase === "ended") return;
    this.phase = "ended";
    this.result = result;
    this.endedAt = this.now();
    this.roundLocked = true;
    const s = this.stats;
    this.log(
      `fim da C4: ${result} | payloads ${s.payloads}, valores repetidos ${s.repeated}, ` +
        `correções ${s.corrections}, atrasados ignorados ${s.ignoredLate} (maior atraso ${(s.maxLateMs / 1000).toFixed(2)}s)`
    );
  }

  /** Recebe um payload JSON do CS2. */
  ingest(p, { offsetSec = 0 } = {}) {
    const t = this.now();
    this.lastPayloadAt = t;
    if (!p || typeof p !== "object") return;

    const map = p.map || null;
    const round = p.round || null;
    const pc = p.phase_countdowns || null;
    const bomb = p.bomb || null;
    const player = p.player || null;

    // Seu lado (T ou CT) e seu kit.
    // Quando você morre, o bloco "player" passa a ser de quem você está
    // assistindo. Comparando com o steamid do provider (sempre o seu),
    // mantemos o SEU lado e não o do jogador assistido.
    const mySteamId = p.provider && p.provider.steamid ? String(p.provider.steamid) : "";
    if (player) {
      const isMe = !mySteamId || !player.steamid || String(player.steamid) === mySteamId;
      if (isMe) {
        const st = player.state || {};
        if (player.team === "T" || player.team === "CT") this.setTeam(player.team);
        this.hasKit = st.defusekit === true || st.defusekit === "true";
      } else {
        if (!this.team && (player.team === "T" || player.team === "CT")) this.setTeam(player.team);
        this.hasKit = false; // morto: seu kit não importa mais nesta rodada
      }
    }

    // Menu principal / saiu da partida
    if (!map && !round) {
      if (this.team) this.setTeam("");
      if (this.phase !== "idle" && this.source !== "demo") this.reset("fora de partida");
      return;
    }

    // Nova rodada destrava o rastreador
    const rn = map ? num(map.round) : null;
    if (rn !== null && this.roundNumber !== null && rn !== this.roundNumber) {
      this.reset(`nova rodada ${rn}`);
    }
    if (rn !== null) this.roundNumber = rn;
    if (round && round.phase === "freezetime") {
      if (this.phase !== "idle" || this.roundLocked) this.reset("freezetime");
      return;
    }
    if (this.source === "demo") return; // não mistura simulação com jogo real

    const roundBomb = round ? round.bomb || "" : "";
    if (roundBomb === "exploded") return this._end("exploded");
    if (roundBomb === "defused") return this._end("defused");
    if (bomb && bomb.state === "exploded") return this._end("exploded");
    if (bomb && bomb.state === "defused") return this._end("defused");

    // Fontes com tempo exato
    if (this.phase === "planted") this.stats.payloads++;
    if (pc && pc.phase === "bomb" && num(pc.phase_ends_in) !== null) {
      this._exactSample("phase_countdowns", num(pc.phase_ends_in), t, offsetSec);
    } else if (bomb && bomb.state === "planted" && num(bomb.countdown) !== null) {
      this._exactSample("bomb", num(bomb.countdown), t, offsetSec);
    }

    // De propósito, o plugin NÃO acompanha se alguém está defusando: para o
    // TR isso revelaria uma informação que o jogo esconde (o "jogo mental"
    // de expor ou não para cortar o defuse).

    // Fonte básica: só sabemos que foi plantada agora
    if (roundBomb === "planted" && this.phase !== "planted") {
      this._setExplodeAt(t + BOMB_TIME * 1000, "round", offsetSec);
    }
  }

  /** Chamado em loop para tratar fim por tempo e sumir com a tela de resultado. */
  tick() {
    const t = this.now();
    if (this.phase === "planted" && t > this.explodeAt + 1500) {
      // Se o CS2 não avisou (ex.: simulação), assume explosão
      this._end("exploded");
    }
    if (this.phase === "ended" && t > this.endedAt + this.endDisplayMs) {
      const locked = this.source !== "demo";
      this.phase = "idle";
      this.explodeAt = null;
      this.result = null;
      if (!locked) this.reset("fim da simulação");
    }
  }

  snapshot() {
    const t = this.now();
    return {
      phase: this.phase,
      remaining: this.explodeAt !== null ? Math.max(0, (this.explodeAt - t) / 1000) : null,
      hasKit: this.hasKit,
      team: this.team,
      source: this.source,
      result: this.result,
      connected: this.lastPayloadAt !== null && t - this.lastPayloadAt < 25000,
      lastPayloadAgoMs: this.lastPayloadAt !== null ? t - this.lastPayloadAt : null,
    };
  }
}

/**
 * Sobe o servidor HTTP que recebe os POSTs do CS2.
 * Só aceita conexões locais e confere o token do arquivo .cfg.
 */
export function startGsiServer({ port, token, onPayload, onError }) {
  const server = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Ulanzi C4 Timer: servidor GSI ativo");
      return;
    }
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (c) => {
      body += c;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on("end", () => {
      res.writeHead(200);
      res.end();
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return;
      }
      const expected = typeof token === "function" ? token() : token;
      if (expected && (!data.auth || data.auth.token !== expected)) return;
      onPayload(data);
    });
  });
  server.on("error", (e) => onError && onError(e));
  server.listen(port, "127.0.0.1");
  return server;
}
