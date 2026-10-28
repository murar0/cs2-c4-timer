/**
 * Codificador PNG mínimo (sem dependências) para a arte 8-bit.
 * Amplia cada pixel lógico em um bloco SCALE x SCALE, sem suavização.
 */
import zlib from "zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    v = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    rgbCache.set(hex, v);
  }
  return v;
}

export function encodePng(cv, scale) {
  const outW = cv.w * scale;
  const outH = cv.h * scale;
  const stride = outW * 3 + 1;
  const raw = Buffer.alloc(stride * outH);
  for (let y = 0; y < outH; y++) {
    const ly = Math.floor(y / scale);
    let p = y * stride;
    raw[p++] = 0;
    for (let x = 0; x < outW; x++) {
      const [r, g, b] = rgb(cv.px[ly * cv.w + Math.floor(x / scale)]);
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(outW, 0);
  ihdr.writeUInt32BE(outH, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function pngDataUrl(cv, scale) {
  return "data:image/png;base64," + encodePng(cv, scale).toString("base64");
}
