let SETTINGS = {};
let form = null;

$UD.connect("com.ulanzi.ulanzistudio.cs2c4.timer");

$UD.onConnected(() => {
  form = document.querySelector("#property-inspector");
  document.querySelector(".uspi-wrapper").classList.remove("hidden");

  form.addEventListener(
    "input",
    Utils.debounce(() => {
      SETTINGS = Utils.getFormValue(form);
      $UD.sendParamFromPlugin(SETTINGS);
    })
  );

  document.getElementById("btnInstall").addEventListener("click", () => {
    setText("installMsg", "Procurando a pasta do CS2...");
    $UD.sendToPlugin({ cmd: "installCfg" });
  });
  document.getElementById("btnDemo").addEventListener("click", () => {
    $UD.sendToPlugin({ cmd: "demo" });
  });
  document.getElementById("btnCfg").addEventListener("click", () => {
    $UD.sendToPlugin({ cmd: "showCfg" });
  });
  document.getElementById("btnMeteor").addEventListener("click", () => {
    $UD.sendToPlugin({ cmd: "meteor" });
  });
});

$UD.onAdd((jsn) => {
  if (jsn && jsn.param) loadSettings(jsn.param);
});
$UD.onParamFromApp((jsn) => {
  if (jsn && jsn.param) loadSettings(jsn.param);
});

function loadSettings(params) {
  SETTINGS = params || {};
  if (form && Object.keys(SETTINGS).length) Utils.setFormValue(SETTINGS, form);
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function setDot(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("on", "err");
  if (cls) el.classList.add(cls);
}

const PHASES = { idle: "sem C4 plantada", planted: "C4 PLANTADA", ended: "rodada da C4 encerrada", demo: "simulação rodando" };
const SOURCES = {
  phase_countdowns: "tempo exato do jogo",
  bomb: "tempo exato (espectador)",
  round: "estimado a partir do aviso de plant",
  demo: "simulação",
};

$UD.onSendToPropertyInspector((jsn) => {
  const data = jsn.payload || jsn.param || jsn;
  if (!data || !data.type) return;

  if (data.type === "status") {
    setDot("dotServer", data.server && data.server.ok ? "on" : "err");
    setText("txtServer", "Servidor: " + (data.server ? data.server.msg : "?"));

    if (data.connected) {
      setDot("dotGame", "on");
      const s = Math.round((data.lastPayloadAgoMs || 0) / 1000);
      setText("txtGame", `CS2: conectado (último dado há ${s}s)`);
    } else {
      setDot("dotGame", null);
      setText("txtGame", "CS2: sem dados. Abra o jogo depois de instalar o .cfg");
    }
    let round = "Estado: " + (PHASES[data.phase] || data.phase);
    if (data.phase === "planted" && data.source) round += ` (${SOURCES[data.source] || data.source})`;
    if (data.team === "T") round += " | você é TR";
    if (data.team === "CT") round += data.hasKit ? " | você é CT, com kit" : " | você é CT, sem kit";
    setText("txtRound", round);
  }

  if (data.type === "installResult") {
    if (data.ok) {
      setText("installMsg", "Instalado em:\n" + data.paths.join("\n") + "\n\nReinicie o CS2 para ele carregar o arquivo.");
    } else {
      setText("installMsg", data.error || "Falhou.");
    }
  }

  if (data.type === "cfgText") {
    const ta = document.getElementById("cfgText");
    ta.value = data.text;
    ta.classList.remove("hidden");
    setText("installMsg", `Salve como "${data.name}" na pasta:\n...\\Counter-Strike Global Offensive\\game\\csgo\\cfg`);
  }
});
