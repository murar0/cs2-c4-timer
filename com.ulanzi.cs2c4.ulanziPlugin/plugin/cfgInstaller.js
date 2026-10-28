/**
 * Localiza a pasta cfg do CS2 na Steam e grava o arquivo de integração.
 * Só roda quando você clica em "Instalar no CS2" no painel da tecla.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";

export const CFG_NAME = "gamestate_integration_ulanzi_c4.cfg";
const CS2_REL = path.join("steamapps", "common", "Counter-Strike Global Offensive", "game", "csgo", "cfg");

export function buildCfg(port, token) {
  return `"Ulanzi C4 Timer"
{
  "uri"       "http://127.0.0.1:${port}"
  "timeout"   "5.0"
  "buffer"    "0.0"
  "throttle"  "0.1"
  "heartbeat" "10.0"
  "auth"
  {
    "token" "${token}"
  }
  "output"
  {
    "precision_time"     "2"
    "precision_position" "1"
    "precision_vector"   "2"
  }
  "data"
  {
    "provider"         "1"
    "map"              "1"
    "round"            "1"
    "player_id"        "1"
    "player_state"     "1"
    "phase_countdowns" "1"
    "bomb"             "1"
  }
}
`;
}

function regSteamPath() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve(null);
    execFile("reg", ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"], { windowsHide: true }, (err, out) => {
      if (err) return resolve(null);
      const m = /SteamPath\s+REG_SZ\s+(.+)/i.exec(out);
      resolve(m ? m[1].trim().replace(/\//g, "\\") : null);
    });
  });
}

function libraryFolders(steamRoot) {
  const libs = [steamRoot];
  try {
    const vdf = fs.readFileSync(path.join(steamRoot, "steamapps", "libraryfolders.vdf"), "utf8");
    const re = /"path"\s+"([^"]+)"/g;
    let m;
    while ((m = re.exec(vdf))) libs.push(m[1].replace(/\\\\/g, "\\"));
  } catch {
    /* sem libraryfolders.vdf */
  }
  return libs;
}

export async function findCs2CfgDirs() {
  const roots = new Set();
  const reg = await regSteamPath();
  if (reg) roots.add(reg);
  if (process.platform === "win32") {
    roots.add("C:\\Program Files (x86)\\Steam");
    roots.add("C:\\Program Files\\Steam");
  } else {
    roots.add(path.join(os.homedir(), ".steam", "steam"));
    roots.add(path.join(os.homedir(), ".local", "share", "Steam"));
  }

  const found = new Set();
  for (const root of roots) {
    for (const lib of libraryFolders(root)) {
      const dir = path.join(lib, CS2_REL);
      try {
        if (fs.statSync(dir).isDirectory()) found.add(path.normalize(dir));
      } catch {
        /* não existe */
      }
    }
  }
  return [...found];
}

export async function installCfg(port, token) {
  const dirs = await findCs2CfgDirs();
  if (!dirs.length) {
    return { ok: false, error: "Não achei a pasta do CS2. Copie o .cfg manualmente (veja o README)." };
  }
  const written = [];
  for (const dir of dirs) {
    const file = path.join(dir, CFG_NAME);
    fs.writeFileSync(file, buildCfg(port, token), "utf8");
    written.push(file);
  }
  return { ok: true, paths: written };
}

/** Senha (token) de um .cfg nosso já instalado no CS2, se existir. */
export async function readInstalledToken() {
  for (const dir of await findCs2CfgDirs()) {
    try {
      const m = /"token"\s+"([^"]+)"/.exec(fs.readFileSync(path.join(dir, CFG_NAME), "utf8"));
      if (m) return m[1];
    } catch {
      /* não instalado nessa pasta */
    }
  }
  return null;
}
