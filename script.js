// ================================
// 全体設計：
// - サウンド一覧（デフォルト + カスタム）を保持
// - rules: 動作(action) -> soundUrl を localStorage に保存
// - WebAudio でバッファを読み込み再生（iPhone Chrome 対策）
// - スタートで AudioContext を resume し、DeviceMotion の許可を得て動作開始
// ================================

/* -------------------------
   定数・初期値
   ------------------------- */
const DEFAULT_SOUNDS = [
  { name: "ポン", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_5a89b19331.mp3" },
  { name: "コイン", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_9c650c3aef.mp3" },
  { name: "ポップ", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_0c07ad012a.mp3" },
  { name: "クリック", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_b77dae1f3d.mp3" }
];

const ACTIONS = {
  shake: "Shake",
  smallShake: "SmallShake",
  rhythmShake: "RhythmShake",
  tiltRight: "TiltRight",
  tiltLeft: "TiltLeft",
  faceUp: "FaceUp",
  faceDown: "FaceDown",
  roll: "Roll",
  pitch: "Pitch",
  spin: "Spin"
};

/* -------------------------
   DOM
   ------------------------- */
const startBtn = document.getElementById("startBtn");
const openSettings = document.getElementById("openSettings");
const settingsPanel = document.getElementById("settingsPanel");
const statusEl = document.getElementById("status");

const actionSelect = document.getElementById("actionSelect");
const soundSelect = document.getElementById("soundSelect");
const customUrl = document.getElementById("customUrl");
const addCustom = document.getElementById("addCustom");
const assignBtn = document.getElementById("assignBtn");
const rulesList = document.getElementById("rulesList");
const previewSound = document.getElementById("previewSound");

const volumeSlider = document.getElementById("volume");
const sensitivitySlider = document.getElementById("sensitivity");
const rhythmMinEl = document.getElementById("rhythmMin");
const rhythmMaxEl = document.getElementById("rhythmMax");
const saveSettingsBtn = document.getElementById("saveSettings");

const countEl = document.getElementById("count");
const rhythmEl = document.getElementById("rhythm");
const tiltEl = document.getElementById("tilt");

/* -------------------------
   State (localStorage)
   - soundList: [{name,url}, ...]
   - rules: { action: url }
   ------------------------- */
let soundList = [];
let rules = {};
let audioCtx = null;
let buffers = {}; // url -> AudioBuffer
let volume = Number(volumeSlider.value || 1);
let sensitivity = Number(sensitivitySlider.value || 20);
let rhythmMin = Number(rhythmMinEl.value || 300);
let rhythmMax = Number(rhythmMaxEl.value || 600);

/* -------------------------
   初期化（ロード）
   ------------------------- */
function loadState() {
  const sl = localStorage.getItem("ms_soundList");
  const rl = localStorage.getItem("ms_rules");

  soundList = sl ? JSON.parse(sl) : DEFAULT_SOUNDS.slice();
  rules = rl ? JSON.parse(rl) : {};
}

function saveState() {
  localStorage.setItem("ms_soundList", JSON.stringify(soundList));
  localStorage.setItem("ms_rules", JSON.stringify(rules));
}

/* -------------------------
   UI 更新
   ------------------------- */
function populateSoundSelect() {
  soundSelect.innerHTML = "";
  soundList.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.url;
    opt.textContent = s.name;
    soundSelect.appendChild(opt);
  });
}

function renderRules() {
  rulesList.innerHTML = "";
  for (const actionKey in ACTIONS) {
    const li = document.createElement("li");
    const assigned = rules[actionKey] || "-";
    li.innerHTML = `<div><strong>${ACTIONS[actionKey]}</strong> → <span class="assigned">${assigned}</span></div>`;
    const btn = document.createElement("button");
    btn.textContent = "解除";
    btn.addEventListener("click", () => {
      delete rules[actionKey];
      saveState();
      renderRules();
    });
    li.appendChild(btn);
    rulesList.appendChild(li);
  }
}

/* -------------------------
   サウンド読み込み（WebAudio）
   - cache: buffers[url]
   ------------------------- */
async function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") await audioCtx.resume();
}

async function loadBuffer(url) {
  if (!url) return null;
  if (buffers[url]) return buffers[url];
  try {
    // fetch arraybuffer (works with https data URLs usually)
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const arrayBuffer = await res.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    buffers[url] = decoded;
    return decoded;
  } catch (e) {
    console.warn("loadBuffer failed for", url, e);
    buffers[url] = null;
    return null;
  }
}

function playBuffer(url) {
  // Attempt WebAudio buffer playback; fallback to HTMLAudio if failed
  if (!audioCtx) return;
  const buf = buffers[url];
  if (buf) {
    try {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(audioCtx.destination);
      src.start();
      return;
    } catch (e) {
      console.warn("playBuffer error", e);
    }
  }
  // fallback
  const a = new Audio(url);
  a.volume = volume;
  a.play().catch(()=>{});
}

/* -------------------------
   UI イベント
   ------------------------- */
openSettings.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

addCustom.addEventListener("click", () => {
  const url = (customUrl.value || "").trim();
  if (!url) { alert("URL を入力してください"); return; }
  const name = "カスタム：" + url.split("/").pop();
  soundList.push({ name, url });
  saveState();
  populateSoundSelect();
  customUrl.value = "";
  alert("カスタム音を追加しました");
});

assignBtn.addEventListener("click", () => {
  const action = actionSelect.value;
  const url = soundSelect.value;
  if (!action || !url) { alert("動作と音を選んでください"); return; }
  rules[action] = url;
  saveState();
  renderRules();
  alert("割り当てました");
});

previewSound.addEventListener("click", async () => {
  const url = soundSelect.value;
  if (!url) return;
  await ensureAudioContext();
  await loadBuffer(url);
  playBuffer(url);
});

volumeSlider.addEventListener("input", () => {
  volume = Number(volumeSlider.value);
});
sensitivitySlider.addEventListener("input", () => {
  sensitivity = Number(sensitivitySlider.value);
});
rhythmMinEl.addEventListener("input", () => { rhythmMin = Number(rhythmMinEl.value); });
rhythmMaxEl.addEventListener("input", () => { rhythmMax = Number(rhythmMaxEl.value); });

saveSettingsBtn.addEventListener("click", () => {
  saveState();
  alert("設定を保存しました");
});

/* -------------------------
   モーション検知ロジック
   - devicemotion + deviceorientation を組み合わせ
   ------------------------- */
let lastAcc = { x: null, y: null, z: null };
let lastShakeTime = 0;
let shakeCount = 0;

// orientation for roll/pitch/spin
let lastOrient = { alpha: null, beta: null, gamma: null };
let spinWindow = []; // track alpha velocity for spin detection

function handleMotionEvent(e) {
  const acc = e.accelerationIncludingGravity || e.acceleration;
  if (!acc) return;

  const x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
  if (lastAcc.x === null) {
    lastAcc = { x, y, z };
    return;
  }

  const diff = Math.abs(x - lastAcc.x) + Math.abs(y - lastAcc.y) + Math.abs(z - lastAcc.z);

  // 1. Shake (strong)
  if (diff > sensitivity + 8) { // strong shake
    triggerAction("shake");
  }
  // 2. Small shake
  else if (diff > Math.max(8, Math.floor(sensitivity/2))) {
    triggerAction("smallShake");
  }

  // Rhythm: detect two quick shakes within rhythmMin..rhythmMax
  if (diff > sensitivity) {
    const now = Date.now();
    const interval = now - lastShakeTime;
    if (interval > 30 && interval < 2000) {
      // check for rhythm window
      if (interval >= rhythmMin && interval <= rhythmMax) {
        triggerAction("rhythmShake");
      }
    }
    lastShakeTime = now;
    shakeCount++;
    countEl.textContent = shakeCount;
  }

  lastAcc = { x, y, z };
}

function handleOrientationEvent(e) {
  const a = e.alpha, b = e.beta, g = e.gamma;
  // tilt left/right by gamma
  if (g != null) {
    if (g > 20) {
      triggerAction("tiltRight");
      tiltEl.textContent = "右";
    } else if (g < -20) {
      triggerAction("tiltLeft");
      tiltEl.textContent = "左";
    } else {
      tiltEl.textContent = "まっすぐ";
    }
  }
  // faceUp / faceDown by beta
  if (b != null) {
    if (b < -30) triggerAction("faceUp");
    else if (b > 30) triggerAction("faceDown");
  }

  // roll / pitch / spin detection
  if (lastOrient.alpha != null && a != null) {
    const deltaA = Math.abs(a - lastOrient.alpha);
    const deltaB = b != null && lastOrient.beta != null ? Math.abs(b - lastOrient.beta) : 0;

    if (deltaA > 20) triggerAction("roll");
    if (deltaB > 20) triggerAction("pitch");

    // spin: track recent alpha deltas (speed)
    const now = Date.now();
    const vel = deltaA; // rough
    spinWindow.push({ t: now, v: vel });
    // remove old
    while (spinWindow.length && now - spinWindow[0].t > 500) spinWindow.shift();
    const avgV = spinWindow.reduce((s,i)=>s+i.v,0)/Math.max(1,spinWindow.length);
    if (avgV > 25) {
      triggerAction("spin");
    }
  }

  lastOrient = { alpha: a, beta: b, gamma: g };
}

/* -------------------------
   Action トリガー
   - rules にマッチすれば playBuffer(url)
   ------------------------- */
let lastPlayedAt = {}; // action -> timestamp (throttle)
const THROTTLE_MS = 300; // 同一アクション短時間で連打防止

function triggerAction(actionKey) {
  const now = Date.now();
  if (lastPlayedAt[actionKey] && now - lastPlayedAt[actionKey] < THROTTLE_MS) return;
  lastPlayedAt[actionKey] = now;

  const url = rules[actionKey];
  if (!url) return;
  // Ensure audio context and buffer loaded (async-safe)
  (async () => {
    await ensureAudioContext();
    await loadBuffer(url); // attempts fetch if not loaded
    playBuffer(url);
  })();
}

/* -------------------------
   スタート処理（許可・初期化）
   ------------------------- */
async function startAll() {
  // 解禁用の短い空バッファ（iOS対策）
  await ensureAudioContext();
  try {
    const empty = audioCtx.createBuffer(1,1,22050);
    const src = audioCtx.createBufferSource();
    src.buffer = empty;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch(e){}

  // preload all soundList buffers (optional)
  for (const s of soundList) {
    await loadBuffer(s.url).catch(()=>{});
  }

  // permissions for motion
  if (typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const p = await DeviceMotionEvent.requestPermission();
      let p2 = "granted";
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        p2 = await DeviceOrientationEvent.requestPermission();
      }
      if (p !== "granted" || p2 !== "granted") {
        statusEl.textContent = "状態：モーション許可が必要です";
        alert("モーション許可が必要です（ページの許可を確認してください）");
        return;
      }
    } catch (e) {
      console.warn("permission error", e);
    }
  }

  // add listeners
  window.addEventListener("devicemotion", handleMotionEvent);
  window.addEventListener("deviceorientation", handleOrientationEvent);
  statusEl.textContent = "状態：稼働中（振ってみてください）";
}

/* -------------------------
   初期ロード
   ------------------------- */
loadState();
populateSoundSelect();
renderRules();

// attach start
startBtn.addEventListener("click", async () => {
  await startAll();
});

// restore sliders
volume = Number(volumeSlider.value);
sensitivity = Number(sensitivitySlider.value);
rhythmMin = Number(rhythmMinEl.value);
rhythmMax = Number(rhythmMaxEl.value);
