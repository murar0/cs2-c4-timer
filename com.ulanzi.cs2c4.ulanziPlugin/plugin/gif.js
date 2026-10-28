/**
 * Codificador GIF animado (GIF89a, LZW) sem dependências.
 * Usado pelo gerador de animações e em tempo real (contagem e estrela
 * cadente), para que o próprio deck toque a animação.
 */
import { SCALE } from "./art.js";

function lzw(indices, minCodeSize) {
  const out = [];
  let cur = 0;
  let curBits = 0;
  const clearCode = 1 << minCodeSize;
  const eoi = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  let table = new Map();
  const emit = (code) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      out.push(cur & 0xff);
      cur >>>= 8;
      curBits -= 8;
    }
  };
  emit(clearCode);
  let w = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (w << 8) | k;
    const hit = table.get(key);
    if (hit !== undefined) {
      w = hit;
      continue;
    }
    emit(w);
    if (next === 4096) {
      emit(clearCode);
      table = new Map();
      next = eoi + 1;
      codeSize = minCodeSize + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      table.set(key, next++);
    }
    w = k;
  }
  emit(w);
  emit(eoi);
  if (curBits > 0) out.push(cur & 0xff);
  return out;
}

/**
 * frames: Canvas[] (mesmo tamanho), delays: ms por quadro,
 * loop: true repete para sempre, false toca uma vez e para no último quadro.
 */
export function encodeGif(frames, delays, loop, scale = SCALE) {
  const outW = frames[0].w * scale;
  const outH = frames[0].h * scale;
  const colors = [];
  const idx = new Map();
  for (const fr of frames)
    for (const c of fr.px)
      if (!idx.has(c)) {
        idx.set(c, colors.length);
        colors.push(c);
      }
  if (colors.length > 256) throw new Error("cores demais: " + colors.length);
  let bits = 1;
  while (1 << bits < colors.length) bits++;
  const palSize = 1 << bits;

  const bytes = [];
  const push = (...b) => {
    for (const v of b) bytes.push(v);
  };
  const u16 = (v) => push(v & 0xff, (v >> 8) & 0xff);
  push(...Buffer.from("GIF89a"));
  u16(outW);
  u16(outH);
  push(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0);
  for (let i = 0; i < palSize; i++) {
    const c = colors[i] || "#000000";
    push(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16));
  }
  if (loop) push(0x21, 0xff, 0x0b, ...Buffer.from("NETSCAPE2.0"), 3, 1, 0, 0, 0);

  const minCode = Math.max(2, bits);
  const data = new Uint8Array(outW * outH);
  frames.forEach((fr, n) => {
    const cs = Math.max(2, Math.min(65535, Math.round(delays[n] / 10)));
    push(0x21, 0xf9, 4, 0x04, cs & 0xff, cs >> 8, 0, 0);
    push(0x2c);
    u16(0);
    u16(0);
    u16(outW);
    u16(outH);
    push(0);
    for (let y = 0; y < outH; y++) {
      const row = Math.floor(y / scale) * fr.w;
      for (let x = 0; x < outW; x++) data[y * outW + x] = idx.get(fr.px[row + Math.floor(x / scale)]);
    }
    push(minCode);
    const comp = lzw(data, minCode);
    for (let i = 0; i < comp.length; i += 255) {
      const chunk = comp.slice(i, i + 255);
      push(chunk.length, ...chunk);
    }
    push(0);
  });
  push(0x3b);
  return Buffer.from(bytes);
}
