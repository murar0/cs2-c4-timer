/**
 * Arte 8-bit do plugin: tudo é desenhado numa grade de pixels lógicos.
 * Cada tecla tem 49 x 49 pixels lógicos (cada um vira 4 x 4 no deck = 196).
 * A tecla larga (2 teclas) tem 98 x 49 e é cortada em duas metades.
 *
 * Usado em tempo real (contador, telas de espera) e pelo gerador de GIFs
 * (bonecos, explosão, defuse).
 */

export const KEY = 49; // pixels lógicos por tecla
export const SCALE = 4; // 49 x 4 = 196 pixels reais

// Paleta 8-bit (16 cores, estilo "Sweetie 16")
export const PAL = {
  ink: "#1a1c2c",
  plum: "#5d275d",
  red: "#b13e53",
  orange: "#ef7d57",
  yellow: "#ffcd75",
  lime: "#a7f070",
  green: "#38b764",
  teal: "#257179",
  navy: "#29366f",
  blue: "#3b5dc9",
  sky: "#41a6f6",
  cyan: "#73eff7",
  white: "#f4f4f4",
  steel: "#94b0c2",
  slate: "#566c86",
  dark: "#333c57",
};

// ------------------------------------------------------------------
// Canvas
// ------------------------------------------------------------------
export class Canvas {
  constructor(w, h, fill = PAL.ink) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(fill);
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  get(x, y) {
    return this.px[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  crop(x, y, w, h) {
    const c = new Canvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.px[j * w + i] = this.px[(y + j) * this.w + x + i];
    return c;
  }
  /** Cópia deslocada (tremida de tela), bordas preenchidas com `fill`. */
  shifted(dx, dy, fill) {
    const c = new Canvas(this.w, this.h, fill);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const sx = x - dx;
        const sy = y - dy;
        if (sx >= 0 && sy >= 0 && sx < this.w && sy < this.h) c.px[y * this.w + x] = this.px[sy * this.w + sx];
      }
    return c;
  }
}

// gerador pseudoaleatório fixo (a animação sai sempre igual)
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------
// Fontes
// ------------------------------------------------------------------
const SMALL = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "011", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  "!": ["1", "1", "1", "0", "1"],
  ".": ["0", "0", "0", "0", "1"],
  ",": ["0", "0", "0", "1", "1"],
  ":": ["0", "1", "0", "1", "0"],
  "-": ["000", "000", "111", "000", "000"],
  "?": ["111", "001", "010", "000", "010"],
  " ": ["0", "0", "0", "0", "0"],
};

// números grandes 5 x 7, traço grosso para leitura rápida
const BIG = {
  0: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  "!": ["1", "1", "1", "1", "1", "0", "1"],
};

// acentos desenhados acima da letra (linhas -2 e -1)
const MARKS = {
  acute: [[2, -2], [1, -1]],
  tilde: [[0, -1], [1, -2], [2, -1]],
  circ: [[0, -1], [1, -2], [2, -1]],
  ced: [[1, 5]],
};
const ACCENTED = {
  "Á": ["A", "acute"], "Ã": ["A", "tilde"], "Â": ["A", "circ"],
  "É": ["E", "acute"], "Ê": ["E", "circ"], "Í": ["I", "acute"],
  "Ó": ["O", "acute"], "Õ": ["O", "tilde"], "Ô": ["O", "circ"],
  "Ú": ["U", "acute"], "Ç": ["C", "ced"],
};

function glyph(ch, font) {
  const table = font === "big" ? BIG : SMALL;
  if (table[ch]) return { rows: table[ch], marks: [] };
  const acc = ACCENTED[ch];
  if (acc && table[acc[0]]) return { rows: table[acc[0]], marks: MARKS[acc[1]] };
  return { rows: table[" "] || SMALL[" "], marks: [] };
}

export function measure(str, font = "small", s = 1) {
  let w = 0;
  const chars = [...str];
  chars.forEach((ch, i) => {
    w += glyph(ch, font).rows[0].length + (i < chars.length - 1 ? 1 : 0);
  });
  return w * s;
}

function drawGlyphs(cv, str, x, y, color, s, font) {
  let cx = x;
  for (const ch of str) {
    const g = glyph(ch, font);
    g.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === "1") cv.rect(cx + c * s, y + r * s, s, s, color);
    });
    for (const [mx, my] of g.marks) cv.rect(cx + mx * s, y + my * s, s, s, color);
    cx += (g.rows[0].length + 1) * s;
  }
}

/** Texto com contorno e/ou sombra (contorno e sombra têm 1 pixel lógico). */
export function drawText(cv, str, x, y, color, { font = "small", s = 1, shadow = null, outline = null } = {}) {
  if (outline) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) drawGlyphs(cv, str, x + dx, y + dy, outline, s, font);
    if (shadow) drawGlyphs(cv, str, x + 1, y + 2, shadow, s, font);
    if (shadow) drawGlyphs(cv, str, x + 2, y + 2, shadow, s, font);
  } else if (shadow) {
    drawGlyphs(cv, str, x + 1, y + 1, shadow, s, font);
  }
  drawGlyphs(cv, str, x, y, color, s, font);
}

export function drawTextC(cv, str, cx, y, color, opts = {}) {
  const w = measure(str, opts.font || "small", opts.s || 1);
  drawText(cv, str, Math.round(cx - w / 2), y, color, opts);
}

/** Maior escala (dentre as candidatas) em que o texto cabe na largura. */
export function fitScale(str, font, maxW, scales) {
  for (const s of scales) if (measure(str, font, s) <= maxW) return s;
  return scales[scales.length - 1];
}

// ------------------------------------------------------------------
// Sprites
// ------------------------------------------------------------------
const OLIVE = "#8a8f5a";
const OLIVE_D = "#5b5e3a";
const LCD_BG = "#0b160e";
const LCD = "#38d16a";

/** C4 de 13 x 8 (mais os fios em cima), ampliada por k. */
export function drawC4(cv, x, y, led, k = 1) {
  const r = (i, j, w, h, c) => cv.rect(x + i * k, y + j * k, w * k, h * k, c);
  r(2, -1, 1, 1, PAL.red);
  r(4, -1, 1, 1, PAL.sky);
  r(6, -1, 1, 1, PAL.yellow);
  r(1, 0, 11, 1, OLIVE);
  r(0, 1, 13, 6, OLIVE);
  r(0, 7, 13, 1, OLIVE_D);
  r(0, 4, 13, 1, OLIVE_D); // fita
  r(2, 1, 7, 3, LCD_BG);
  r(3, 2, 1, 1, LCD);
  r(5, 2, 1, 1, LCD);
  r(7, 2, 1, 1, LCD);
  r(2, 5, 7, 2, OLIVE_D);
  r(3, 5, 1, 1, PAL.steel);
  r(5, 5, 1, 1, PAL.steel);
  r(7, 5, 1, 1, PAL.steel);
  r(3, 6, 1, 1, PAL.steel);
  r(5, 6, 1, 1, PAL.steel);
  r(7, 6, 1, 1, PAL.steel);
  r(10, 2, 2, 2, led);
}

function legs(cv, x, y, f, pants, boot) {
  const step = f % 4;
  const liftL = step === 1 ? 1 : 0;
  const liftR = step === 3 ? 1 : 0;
  cv.rect(x + 3, y + 15, 3, 7 - liftL, pants);
  cv.rect(x + 8, y + 15, 3, 7 - liftR, pants);
  cv.rect(x + 2, y + 22 - liftL, 4, 2, boot);
  cv.rect(x + 8, y + 22 - liftR, 4, 2, boot);
}

/** Boneco TR (14 x 24): balaclava, jaqueta e a C4 nas mãos. */
export function drawTR(cv, x, y, f) {
  const bob = f % 2;
  const k = "#141414";
  const skin = "#d9a066";
  const jacket = "#7a4f2a";
  const jacketDark = "#5c3a1e";
  legs(cv, x, y, f, "#a68a5b", "#3b2a1a");
  const by = y + bob;
  cv.rect(x + 3, by + 0, 8, 7, k);
  cv.rect(x + 4, by + 3, 6, 2, skin);
  cv.set(x + 5, by + 3, k);
  cv.set(x + 8, by + 3, k);
  cv.rect(x + 2, by + 7, 10, 8, jacket);
  cv.rect(x + 2, by + 14, 10, 1, jacketDark);
  cv.rect(x + 6, by + 7, 2, 3, jacketDark);
  cv.rect(x + 0, by + 8, 2, 5, jacket);
  cv.rect(x + 12, by + 8, 2, 5, jacket);
  cv.rect(x + 3, by + 10, 8, 4, OLIVE);
  cv.rect(x + 4, by + 11, 4, 2, LCD_BG);
  cv.set(x + 5, by + 11, "#22c55e");
  cv.set(x + 9, by + 11, f % 4 < 2 ? "#ef4444" : "#4a1414");
  cv.rect(x + 1, by + 12, 2, 2, k);
  cv.rect(x + 11, by + 12, 2, 2, k);
}

/** Boneco CT (14 x 24): capacete, óculos, colete e fuzil. */
export function drawCT(cv, x, y, f) {
  const bob = f % 2;
  const k = "#0f172a";
  const skin = "#e0b088";
  const vest = "#3b5b8c";
  const vestDark = "#24395c";
  const sleeve = "#4b6584";
  legs(cv, x, y, f, "#475569", "#111827");
  const by = y + bob;
  cv.rect(x + 3, by + 0, 8, 3, "#1e3a5f");
  cv.rect(x + 2, by + 2, 10, 1, "#1e3a5f");
  cv.rect(x + 4, by + 3, 6, 4, skin);
  cv.rect(x + 4, by + 3, 6, 1, "#0e7490");
  cv.set(x + 5, by + 3, "#67e8f9");
  cv.rect(x + 5, by + 6, 4, 1, "#c08a62");
  cv.rect(x + 2, by + 7, 10, 8, vest);
  cv.rect(x + 3, by + 9, 3, 2, vestDark);
  cv.rect(x + 8, by + 9, 3, 2, vestDark);
  cv.rect(x + 2, by + 14, 10, 1, vestDark);
  cv.set(x + 10, by + 8, f % 4 < 2 ? "#22c55e" : "#14532d");
  cv.rect(x + 0, by + 8, 2, 5, sleeve);
  cv.rect(x + 12, by + 8, 2, 5, sleeve);
  cv.rect(x - 1, by + 12, 16, 2, "#3f3f46");
  cv.rect(x - 2, by + 12, 2, 3, "#52525b");
  cv.rect(x + 11, by + 14, 2, 2, "#3f3f46");
  cv.rect(x + 1, by + 12, 2, 2, k);
  cv.rect(x + 9, by + 12, 2, 2, k);
}

// ------------------------------------------------------------------
// Cenários dos lados (antes do plant)
// ------------------------------------------------------------------
const SKY_T = ["#2a1608", "#3d200b", "#552c10", "#6e3a14"];
const SKY_CT = ["#060d18", "#0a1628", "#0e1f38", "#132849"];
export const GROUND_Y = 38;

export function background(cv, side, f) {
  const sky = side === "T" ? SKY_T : SKY_CT;
  const band = Math.ceil(GROUND_Y / sky.length);
  for (let y = 0; y < GROUND_Y; y++) {
    const b = Math.min(sky.length - 1, Math.floor(y / band));
    for (let x = 0; x < cv.w; x++) {
      const edge = y % band === band - 1 && b < sky.length - 1 && (x + y) % 2 === 0;
      cv.set(x, y, edge ? sky[b + 1] : sky[b]);
    }
  }
  if (side === "T") {
    const sx = 40;
    const sy = 7;
    for (let y = -4; y <= 4; y++)
      for (let x = -4; x <= 4; x++) {
        const d = x * x + y * y;
        if (d <= 16) cv.set(sx + x, sy + y, d <= 6 ? "#fcd34d" : "#f59e0b");
      }
    cv.rect(0, GROUND_Y, cv.w, cv.h - GROUND_Y, "#b8874f");
    for (let x = 0; x < cv.w; x += 5) cv.set(x + ((x / 5) % 3), GROUND_Y + 2 + ((x / 5) % 4), "#8f6436");
    cv.rect(0, GROUND_Y, cv.w, 1, "#8f6436");
  } else {
    for (let i = 0; i < Math.floor(cv.w / 4); i++) {
      const x = (i * 37 + 11) % cv.w;
      const y = (i * 23 + 5) % 30;
      cv.set(x, y, (f + (i % 4)) % 4 === 0 ? "#93c5fd" : "#3b5b8c");
    }
    cv.rect(0, GROUND_Y, cv.w, cv.h - GROUND_Y, "#334155");
    cv.rect(0, GROUND_Y, cv.w, 1, "#1f2937");
    for (let x = 0; x < cv.w; x += 8) cv.rect(x, GROUND_Y + 1, 1, cv.h - GROUND_Y - 1, "#1f2937");
  }
}

const SIDE_TXT = {
  T: { name: "TR", l1: "PLANTE", l2: "A C4", text: "#fbbf24", shadow: "#3b1d06", accent: "#ef4444" },
  CT: { name: "CT", l1: "SEGURE", l2: "O BOMB", text: "#7dd3fc", shadow: "#020617", accent: "#22c55e" },
};

/** Tela do seu lado. W = 49 (1 tecla) ou 98 (tecla larga). */
export function sceneSide(side, W, f, deco = null) {
  const T = SIDE_TXT[side];
  const cv = new Canvas(W, KEY);
  background(cv, side, f);
  if (deco) deco(cv);
  (side === "T" ? drawTR : drawCT)(cv, 17, 14, f);
  drawText(cv, T.name, 2, 2, T.text, { s: 2, shadow: T.shadow });
  if (W > KEY) {
    drawTextC(cv, T.l1, KEY + 24.5, 12, T.text, { s: 2, shadow: T.shadow });
    drawTextC(cv, T.l2, KEY + 24.5, 26, f % 4 < 2 ? T.text : T.accent, { s: 2, shadow: T.shadow });
  }
  return cv;
}

// ------------------------------------------------------------------
// Espera (sem lado definido)
// ------------------------------------------------------------------
export function sceneIdle(W, connected, deco = null) {
  const cv = new Canvas(W, KEY, PAL.ink);
  for (let i = 0; i < W; i += 1) if ((i * 7) % 11 === 0) cv.set(i, (i * 13) % 30, PAL.dark);
  if (deco) deco(cv);
  cv.rect(0, GROUND_Y, W, KEY - GROUND_Y, PAL.dark);
  cv.rect(0, GROUND_Y, W, 1, PAL.slate);
  drawC4(cv, 24 - 13, GROUND_Y - 16, connected ? PAL.lime : PAL.slate, 2);
  const color = connected ? PAL.lime : PAL.steel;
  if (W > KEY) {
    drawTextC(cv, connected ? "CS2" : "SEM", KEY + 24.5, 10, color, { s: 2, shadow: PAL.ink });
    drawTextC(cv, connected ? "ON" : "CS2", KEY + 24.5, 24, color, { s: 2, shadow: PAL.ink });
  } else {
    drawTextC(cv, connected ? "CS2 ON" : "SEM CS2", 24.5, 41, color, { shadow: PAL.ink });
  }
  return cv;
}

// ------------------------------------------------------------------
// Contador
// ------------------------------------------------------------------
const ZONE_STYLE = {
  green: { bg: PAL.green, edge: PAL.teal, fg: PAL.white, outline: PAL.ink, label: PAL.white, labelSh: PAL.teal, track: PAL.teal, fill: PAL.white },
  amber: { bg: PAL.yellow, edge: PAL.orange, fg: PAL.ink, outline: null, shadow: PAL.orange, label: PAL.ink, labelSh: PAL.orange, track: PAL.orange, fill: PAL.ink },
  red: { bg: PAL.red, edge: PAL.plum, fg: PAL.white, outline: PAL.ink, label: PAL.white, labelSh: PAL.plum, track: PAL.plum, fill: PAL.white },
};

/**
 * Textos do aviso, em uma linha (1 tecla) e em duas (tecla larga).
 */
export function labels(info) {
  if (info.zone === "green") return { one: "DÁ SEM KIT", two: ["DÁ SEM", "KIT"] };
  if (info.zone === "amber") {
    return info.myKit ? { one: "USE SEU KIT", two: ["USE O", "KIT!"] } : { one: "SÓ COM KIT", two: ["SÓ COM", "KIT"] };
  }
  return { one: "SEM TEMPO", two: ["SEM", "TEMPO"] };
}

function frame(cv, st) {
  cv.rect(0, 0, cv.w, cv.h, st.bg);
  cv.rect(0, 0, cv.w, 1, st.edge);
  cv.rect(0, cv.h - 1, cv.w, 1, st.edge);
  cv.rect(0, 0, 1, cv.h, st.edge);
  cv.rect(cv.w - 1, 0, 1, cv.h, st.edge);
}

/**
 * Barra da C4: 40 segundos em `w` pixels (40 = 1 pixel por segundo,
 * 80 = 2 pixels por segundo), com marcas nos limites de 10s e 5s.
 */
function bar(cv, x, y, remaining, st, w = 40) {
  const pps = w / 40;
  cv.rect(x - 1, y - 1, w + 2, 5, PAL.ink);
  cv.rect(x, y, w, 3, st.track);
  const fillW = Math.max(0, Math.min(w, Math.ceil(remaining) * pps));
  cv.rect(x, y, fillW, 3, st.fill);
  for (const s of [10, 5]) {
    const tx = x + s * pps;
    cv.rect(tx, y - 3, 1, 2, PAL.ink);
    cv.rect(tx, y, 1, 3, PAL.ink);
  }
}

/**
 * info: { zone, myKit, timeStr, remaining }
 */
export function sceneCountdown(W, info) {
  const st = ZONE_STYLE[info.zone];
  const cv = new Canvas(W, KEY);
  frame(cv, st);
  const lab = labels(info);
  const labColor = lab.color || st.label;
  const numOpts = (s) => ({ font: "big", s, outline: st.outline, shadow: st.outline ? PAL.ink : st.shadow });

  if (W <= KEY) {
    drawTextC(cv, lab.one, 24.5, 3, labColor, { shadow: st.labelSh });
    const s = fitScale(info.timeStr, "big", 43, [4, 3, 2]);
    const y = s === 4 ? 9 : 11;
    drawTextC(cv, info.timeStr, 24.5, y, st.fg, numOpts(s));
    bar(cv, 4, 42, info.remaining, st);
  } else {
    // tecla larga: número na esquerda, aviso na direita e a barra longa
    // atravessando as duas teclas (2 pixels por segundo)
    const s = fitScale(info.timeStr, "big", 43, [4, 3, 2]);
    drawTextC(cv, info.timeStr, 24.5, s === 4 ? 6 : 9, st.fg, numOpts(s));
    const cx = KEY + 24.5;
    lab.two.forEach((line, i) => {
      const ls = fitScale(line, "small", 46, [2, 1]);
      drawTextC(cv, line, cx, 8 + i * 15, labColor, { s: ls, shadow: st.labelSh || PAL.ink });
    });
    bar(cv, 9, 42, info.remaining, st, 80);
  }
  return cv;
}

// ------------------------------------------------------------------
// Explosão
// ------------------------------------------------------------------
export const BOOM_DELAYS = [90, 90, 70, 60, 60, 70, 70, 70, 70, 70, 70, 70, 110, 110, 110, 110, 110, 110, 160, 160, 160, 160, 1400];
const HEAT = [PAL.white, PAL.yellow, PAL.orange, PAL.red, PAL.plum, PAL.dark, PAL.ink];
const SHAKE = { 3: [0, 0], 4: [2, -1], 5: [-2, 1], 6: [2, 1], 7: [-1, -1], 8: [1, 1], 9: [-1, 0], 10: [1, 0], 11: [0, 1] };

function noiseAt(angle, seed) {
  const b = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 14);
  const r = rng(b * 97 + seed * 13)();
  return 0.82 + 0.18 * r;
}

function fireball(cv, cx, cy, r, heat, seed) {
  if (r <= 0) return;
  const R = Math.ceil(r + 1);
  for (let y = -R; y <= R; y++)
    for (let x = -R; x <= R; x++) {
      const d = Math.sqrt(x * x + y * y);
      const re = r * noiseAt(Math.atan2(y, x), seed);
      if (d > re) continue;
      const t = (d / re) * 4 + (1 - heat) * 3;
      let i = Math.floor(t);
      if (t - i > 0.5 && (x + y) % 2 === 0) i++; // pontilhado na transição
      cv.set(cx + x, cy + y, HEAT[Math.max(0, Math.min(HEAT.length - 1, i))]);
    }
}

export function sceneBoom(W, f) {
  const cv = new Canvas(W, KEY, PAL.ink);
  const cx = Math.round(W / 2) - (W > KEY ? 0 : 0);
  const cy = 30;
  const rmax = W > KEY ? 34 : 26;
  const rand = rng(7);
  const debris = Array.from({ length: W > KEY ? 34 : 22 }, () => ({
    a: -Math.PI * (0.05 + 0.9 * rand()),
    v: 0.9 + 1.6 * rand(),
    c: [PAL.white, PAL.yellow, PAL.orange][Math.floor(rand() * 3)],
    big: rand() < 0.3,
  }));

  // fundo e chão
  for (let i = 0; i < W; i++) if ((i * 7) % 11 === 0) cv.set(i, (i * 13) % 30, PAL.dark);
  cv.rect(0, GROUND_Y, W, KEY - GROUND_Y, PAL.dark);
  cv.rect(0, GROUND_Y, W, 1, PAL.slate);

  if (f <= 2) {
    // últimos bipes
    const led = f === 1 ? PAL.plum : PAL.red;
    if (f === 2) cv.rect(0, 0, W, GROUND_Y, PAL.plum);
    drawC4(cv, cx - 13, GROUND_Y - 16, led, 2);
    if (f !== 1) for (const [dx, dy] of [[-3, -3], [3, -3], [0, -5]]) cv.set(cx + 13 + dx, GROUND_Y - 13 + dy, PAL.red);
    return cv;
  }
  if (f === 3) {
    cv.rect(0, 0, W, KEY, PAL.white);
    return cv;
  }

  const t = f - 4; // 0..18
  if (f === 4) cv.rect(0, 0, W, KEY, PAL.yellow);

  if (f >= 12) {
    // cratera
    for (let x = -14; x <= 14; x++) cv.rect(cx + x, GROUND_Y, 1, 1 + (Math.abs(x) < 9 ? 2 : 1), PAL.ink);
  }

  // bola de fogo
  if (f <= 17) {
    const grow = Math.min(1, (t + 1) / 7);
    const r = rmax * (1 - Math.pow(1 - grow, 2)) * (f >= 12 ? 1 - (f - 11) * 0.12 : 1);
    const heat = f <= 8 ? 1 : Math.max(0, 1 - (f - 8) * 0.12);
    fireball(cv, cx, cy - (f >= 12 ? (f - 11) * 2 : 0), r, heat, f);
  }

  // fumaça subindo
  if (f >= 12) {
    const k = f - 12;
    const puffs = W > KEY ? 7 : 4;
    for (let i = 0; i < puffs; i++) {
      const px = cx + (i - (puffs - 1) / 2) * (W > KEY ? 10 : 9);
      const py = cy - 6 - k * 1.5 - (i % 2) * 3;
      const pr = 5 + k * 0.6 + (i % 3);
      for (let y = -pr; y <= pr; y++)
        for (let x = -pr; x <= pr; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d > pr) continue;
          const c = d < pr * 0.6 ? PAL.slate : (x + y + k) % 2 === 0 ? PAL.dark : PAL.slate;
          cv.set(px + x, py + y, c);
        }
    }
    // brasas
    const er = rng(100 + f);
    for (let i = 0; i < (W > KEY ? 16 : 9); i++) {
      cv.set(Math.floor(er() * W), GROUND_Y - 1 - Math.floor(er() * 14), er() < 0.5 ? PAL.orange : PAL.yellow);
    }
  }

  // estilhaços
  if (t >= 0 && t <= 13) {
    for (const d of debris) {
      const x = cx + Math.cos(d.a) * d.v * t * 2.2;
      const y = cy + Math.sin(d.a) * d.v * t * 2.2 + 0.18 * t * t;
      if (y < GROUND_Y) {
        cv.set(x, y, d.c);
        if (d.big) cv.set(x + 1, y, d.c);
      }
    }
  }

  // BOOM
  if (f >= 8) {
    const wide = W > KEY;
    const word = wide ? "BOOM!" : "BOOM";
    let s = wide ? 3 : 2;
    let y = wide ? 3 : 6;
    if (f === 8) s -= 1;
    if (f === 9) y -= 2;
    if (f === 10) y += 1;
    if (f === 8) y += wide ? 5 : 4;
    const font = "big";
    const color = f >= 18 && f < 22 && f % 2 === 0 ? PAL.white : PAL.yellow;
    drawTextC(cv, word, W / 2, y, color, { font, s, outline: PAL.ink, shadow: PAL.red });
  }

  const sh = SHAKE[f];
  return sh ? cv.shifted(sh[0], sh[1], f === 3 ? PAL.white : PAL.ink) : cv;
}

// ------------------------------------------------------------------
// Defuse
// ------------------------------------------------------------------
export const DEFUSE_DELAYS = [140, 140, 140, 140, 70, 70, 70, 90, 110, 110, 110, 110, 110, 110, 1500];

/** Check grande (pixel art), largura 2*k*... desenhado a partir do canto. */
function drawCheck(cv, x, y, k, color, outline) {
  const pts = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0]];
  const plot = (c, grow) => {
    for (const [i, j] of pts) cv.rect(x + i * k - grow, y + j * k - grow, k * 2 + grow * 2, k * 2 + grow * 2, c);
  };
  plot(outline, 1);
  plot(color, 0);
}

export function sceneDefuse(W, f) {
  const wide = W > KEY;
  const cv = new Canvas(W, KEY, SKY_CT[0]);
  background(cv, "CT", f);
  const cx = 24;
  const c4y = GROUND_Y - 16;

  // 0-3: C4 piscando, alicate chegando | 4-5: corte com faísca | 6: flash
  // 7+: check grande, "DEFUSADA" e confete
  if (f === 6) {
    cv.rect(0, 0, W, KEY, PAL.cyan);
    return cv;
  }
  const led = f <= 3 ? (f % 2 === 0 ? PAL.red : PAL.plum) : f <= 5 ? PAL.yellow : PAL.lime;
  const showC4 = f <= 5 || wide;
  if (showC4) drawC4(cv, cx - 13, c4y, led, 2);
  const wireX = cx - 13 + 4;
  const wireY = c4y - 2;
  if (f <= 5) {
    const ox = f <= 1 ? -4 : 0; // alicate se aproximando
    cv.rect(wireX - 7 + ox, wireY - 9, 3, 8, PAL.steel);
    cv.rect(wireX - 3 + ox, wireY - 9, 3, 8, PAL.steel);
    cv.rect(wireX - 7 + ox, wireY - 15, 3, 6, PAL.red);
    cv.rect(wireX - 3 + ox, wireY - 15, 3, 6, PAL.red);
    cv.rect(wireX - 5 + ox, wireY - 9, 3, 2, PAL.slate);
  }
  if (f === 4 || f === 5) {
    const sp = f === 4
      ? [[0, -3], [-3, 0], [3, 0], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]
      : [[-5, -5], [5, -5], [-5, 3], [5, 3], [0, -6], [-6, 0], [6, 0]];
    for (const [dx, dy] of sp) cv.rect(wireX + dx, wireY + dy, 2, 2, f === 4 ? PAL.white : PAL.yellow);
  }
  if (showC4 && f >= 7) {
    cv.rect(cx - 13 + 4, c4y + 2, 14, 6, LCD_BG);
    drawText(cv, "--", cx - 13 + 6, c4y + 3, LCD);
  }

  if (f >= 7) {
    // check grande que "estala" na tela
    const k = f === 7 ? 2 : 3;
    const chkW = 9 * k;
    if (wide) {
      drawCheck(cv, KEY + 24.5 - chkW / 2, f === 7 ? 6 : 2, k, PAL.lime, PAL.ink);
      drawTextC(cv, "DEFUSADA", KEY + 24.5, 31, PAL.white, { shadow: PAL.ink });
      drawTextC(cv, "CT VENCE", KEY + 24.5, 41, PAL.cyan, { shadow: PAL.ink });
    } else {
      drawCheck(cv, 24.5 - chkW / 2, f === 7 ? 8 : 4, k, PAL.lime, PAL.ink);
      cv.rect(0, 38, W, 11, PAL.navy);
      cv.rect(0, 38, W, 1, PAL.ink);
      drawTextC(cv, "DEFUSADA", 24.5, 41, PAL.white, { shadow: PAL.ink });
    }
    // confete
    const cr = rng(42);
    const colors = [PAL.lime, PAL.cyan, PAL.yellow, PAL.white, PAL.orange];
    for (let i = 0; i < (wide ? 46 : 26); i++) {
      const x = Math.floor(cr() * W);
      const y = -Math.floor(cr() * 24) + (f - 7) * 5;
      const drift = (f + i) % 3 === 0 ? 1 : 0;
      if (y >= 0 && y < 37) cv.rect(x + drift, y, (i % 3) === 0 ? 2 : 1, 2, colors[i % colors.length]);
    }
  }
  return cv;
}

// ------------------------------------------------------------------
// Estrela cadente (passa no céu das telas de espera de vez em quando)
// ------------------------------------------------------------------
export const METEOR_FRAMES = 16;
export const METEOR_DELAY = 150;
const TRAIL = [PAL.white, PAL.white, PAL.white, PAL.cyan, PAL.cyan, PAL.cyan, PAL.sky, PAL.steel, PAL.steel, PAL.slate, PAL.slate, PAL.dark, PAL.dark];

/** Desenha a estrela no quadro f (0..15). Atravessa o céu nos quadros 2..12. */
export function drawMeteor(cv, f) {
  const p = (f - 2) / 10;
  if (p < 0 || p > 1) return;
  const x0 = cv.w + 6;
  const y0 = 1;
  const x1 = -14;
  const y1 = Math.min(24, 10 + cv.w * 0.14);
  const hx = x0 + (x1 - x0) * p;
  const hy = y0 + (y1 - y0) * p;
  const len = Math.hypot(x0 - x1, y1 - y0);
  const dx = (x0 - x1) / len;
  const dy = (y0 - y1) / len;
  const sky = (x, y, c) => {
    if (y < GROUND_Y - 3) cv.set(x, y, c);
  };
  TRAIL.forEach((c, i) => {
    const tx = hx + dx * i * 1.5;
    const ty = hy + dy * i * 1.5;
    sky(tx, ty, c);
    if (i < 6) sky(tx, ty + 1, c); // rastro mais grosso perto da cabeça
  });
  // cabeça 2x2 com brilho em cruz piscando
  sky(hx - 1, hy, PAL.white);
  sky(hx - 1, hy + 1, PAL.white);
  const glow = f % 2 === 0 ? PAL.cyan : PAL.white;
  for (const [ox, oy] of [[-2, 0], [0, -1], [-1, 2], [1, 1]]) sky(hx + ox, hy + oy, glow);
}

// ------------------------------------------------------------------
// Isca do modo de teste: "SE LEU, MAMOU!"
// ------------------------------------------------------------------
export const BAIT_DELAYS = [120, 120, 120, 120, 120, 120, 120, 120, 1300];

export function sceneBait(W, f) {
  const wide = W > KEY;
  const bg = f % 2 === 0 ? PAL.plum : PAL.red;
  const cv = new Canvas(W, KEY, bg);
  // listras diagonais de fundo, andando
  for (let y = 0; y < KEY; y++)
    for (let x = 0; x < W; x++) if ((x + y + f * 2) % 10 < 3) cv.set(x, y, f % 2 === 0 ? PAL.red : PAL.plum);
  const pop = f === 0 ? -1 : 0;
  if (wide) {
    drawTextC(cv, "SE LEU,", W / 2, 4, PAL.yellow, { s: 3 + pop, outline: PAL.ink, shadow: PAL.ink });
    drawTextC(cv, "MAMOU!", W / 2, 22, PAL.white, { s: 3 + pop, outline: PAL.ink, shadow: PAL.ink });
  } else {
    drawTextC(cv, "SE LEU,", 24.5, 5, PAL.yellow, { s: 2 + pop, outline: PAL.ink, shadow: PAL.ink });
    drawTextC(cv, "MAMOU", 24.5, 19, PAL.white, { s: 2 + pop, outline: PAL.ink, shadow: PAL.ink });
  }
  // KKKK correndo embaixo
  const k = "KKKKKKKKKKKKKKKKKKKKKKKKK";
  cv.rect(0, 40, W, 9, PAL.ink);
  drawText(cv, k, 2 - ((f * 3) % 8), 42, PAL.lime);
  return cv;
}

// ------------------------------------------------------------------
// Fundo da janela larga (458 x 196) para usar como imagem de fundo
// ------------------------------------------------------------------
export function sceneBanner() {
  const W = 114;
  const cv = new Canvas(W, KEY);
  const left = new Canvas(57, KEY);
  background(left, "T", 0);
  drawTR(left, 6, 14, 0);
  const right = new Canvas(57, KEY);
  background(right, "CT", 2);
  drawCT(right, 37, 14, 0);
  for (let y = 0; y < KEY; y++)
    for (let x = 0; x < W; x++) {
      // divisão diagonal entre os lados
      const useLeft = x < 57 + Math.floor((y - 24) / 4);
      cv.px[y * W + x] = useLeft ? left.get(Math.min(56, x), y) : right.get(Math.max(0, x - 57), y);
    }
  for (let y = 0; y < KEY; y++) cv.set(57 + Math.floor((y - 24) / 4), y, PAL.ink);
  drawTextC(cv, "C4", W / 2, 7, PAL.yellow, { font: "small", s: 4, outline: PAL.ink, shadow: PAL.red });
  drawTextC(cv, "TIMER", W / 2, 30, PAL.white, { s: 2, outline: PAL.ink });
  return cv;
}
