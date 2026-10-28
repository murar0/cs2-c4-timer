/**
 * Gera as animações 8-bit (GIF) e imagens do plugin a partir de plugin/art.js.
 *
 * Uso: node tools/gerar-animacoes.mjs
 *
 * Saída em assets/anim:
 *   {t|ct}_{single|left|right}.gif      tela do seu lado antes do plant (repete)
 *   boom_{single|left|right}.gif        explosão (toca uma vez)
 *   defuse_{single|left|right}.gif      bomba defusada (toca uma vez)
 *   boomdemo_{single|left|right}.gif    explosão da simulação, com a isca no final
 * E também:
 *   assets/janela-456x196.png           imagem de fundo para a janela larga
 *   assets/icons/key-idle.png           ícone da ação
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { KEY, SCALE, sceneSide, sceneBoom, sceneDefuse, sceneBanner, sceneIdle, sceneBait, BOOM_DELAYS, DEFUSE_DELAYS, BAIT_DELAYS } from "../plugin/art.js";
import { encodeGif } from "../plugin/gif.js";
import { encodePng } from "../plugin/png.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "anim");

// ------------------------------------------------------------------
function writeSet(prefix, count, delays, loop, sceneOf) {
  const single = [];
  const left = [];
  const right = [];
  for (let f = 0; f < count; f++) {
    single.push(sceneOf(KEY, f));
    const wide = sceneOf(KEY * 2, f);
    left.push(wide.crop(0, 0, KEY, KEY));
    right.push(wide.crop(KEY, 0, KEY, KEY));
  }
  for (const [name, frames] of [["single", single], ["left", left], ["right", right]]) {
    const buf = encodeGif(frames, delays, loop);
    fs.writeFileSync(path.join(OUT, `${prefix}_${name}.gif`), buf);
    console.log(`${prefix}_${name}.gif  ${frames.length} quadros  ${(buf.length / 1024).toFixed(1)} KB`);
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) if (/_window\.gif$/.test(old)) fs.unlinkSync(path.join(OUT, old));

const SIDE_FRAMES = 8;
const sideDelays = new Array(SIDE_FRAMES).fill(150);
writeSet("t", SIDE_FRAMES, sideDelays, true, (W, f) => sceneSide("T", W, f));
writeSet("ct", SIDE_FRAMES, sideDelays, true, (W, f) => sceneSide("CT", W, f));
writeSet("boom", BOOM_DELAYS.length, BOOM_DELAYS, false, (W, f) => sceneBoom(W, f));
writeSet("defuse", DEFUSE_DELAYS.length, DEFUSE_DELAYS, false, (W, f) => sceneDefuse(W, f));

// simulação: explosão com o final encurtado e a isca "SE LEU, MAMOU!" depois
const demoBoom = [...BOOM_DELAYS.slice(0, -1), 700];
const demoDelays = [...demoBoom, ...BAIT_DELAYS];
writeSet("boomdemo", demoDelays.length, demoDelays, false, (W, f) =>
  f < demoBoom.length ? sceneBoom(W, f) : sceneBait(W, f - demoBoom.length)
);

// imagem de fundo da janela: 114 x 49 lógicos = 456 x 196, centralizada em 458
const banner = encodePng(sceneBanner(), SCALE);
fs.writeFileSync(path.join(ROOT, "assets", "janela-456x196.png"), banner);
console.log("janela-456x196.png", (banner.length / 1024).toFixed(1), "KB");

fs.writeFileSync(path.join(ROOT, "assets", "icons", "key-idle.png"), encodePng(sceneIdle(KEY, false), SCALE));
console.log("key-idle.png");
