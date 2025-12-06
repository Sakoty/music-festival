// ================================
// 修正版 script.js（iOS対応・安定）
// ================================

// ----- 定数 / DOM -----
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

// DOM
const startBtn = document.getElementById("startBtn");
const openSettings = document.getElementById("openSettings");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");

const actionSelect = document.getElementById("actionSelect");
const soundSelect = document.getElementById("soundSelect");
const customUrl = document.getElementById("customUrl");
const addCustom = document.getElementById("addCustom");
const assignBtn = document.getElementById("assignBtn");
const rulesList = document.getElementById("rulesList");
const previewSound = document.getElementById("previewSound");
const saveSettingsBtn = document.getElementById("saveSettings");

const volumeSlider = document.getElementById("volume");
const sensitivitySlider = document.getElementById("sensitivity");
const rhythmMinEl = document.getElementById("rhythmMin");
const rhythmMaxEl = document.getElementById("rhythmMax");

const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const rhythmEl = document.getElementById("rhythm");
const tiltEl = document.getElementById("tilt");

// ----- State -----
let soundList = [];
let rules = {};
let audioCtx = null;
let buffers = {}; // url -> AudioBuffer|null
let volume = Number(volumeSlider?.value || 1);
let sensitivity = Number(sensitivitySlider?.value || 20);
let rhythmMin = Number(rhythmMinEl?.value || 300);
let rhythmMax = Number(rhythmMaxEl?.value || 600);

let listenersAttached = false; // prevent duplicate listeners

// ----- storage -----
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

// ----- UI helpers -----
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

// ----- WebAudio helpers -----
function isDataUrl(url) { return typeof url === "string" && url.startsWith("data:"); }

async function ensureAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") {
    try { await audioCtx.resume(); } catch(e) { console.warn("resume failed", e); }
  }
  return audioCtx;
}

// play tiny silent buffer to unlock iOS audio reliably
async function unlockAudioContext() {
  await ensureAudioContext();
  try {
    const empty = audioCtx.createBuffer(1,1,22050);
    const src = audioCtx.createBufferSource();
    src.buffer = empty;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch(e) {
    console.warn("unlockAudioContext error", e);
  }
}

async function loadBuffer(url) {
  if (!url) return null;
  if (buffers.hasOwnProperty(url)) return buffers[url]; // cached
  try {
    await ensureAudioContext();
    if (isDataUrl(url)) {
      // decode data: base64 or percent-encoded
      const comma = url.indexOf(',');
      const meta = url.substring(5, comma);
      const isBase64 = meta.endsWith(';base64') || meta.includes(';base64');
      const dataPart = url.substring(comma + 1);
      let arrayBuffer;
      if (isBase64) {
        const binaryString = atob(dataPart);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        arrayBuffer = bytes.buffer;
      } else {
        const decoded = decodeURIComponent(dataPart);
        const len = decoded.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = decoded.charCodeAt(i);
        arrayBuffer = bytes.buffer;
      }
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      buffers[url] = decoded;
      return decoded;
    } else {
      // fetch remote (CORS required)
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed ' + res.status);
      const ab = await res.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(ab.slice(0));
      buffers[url] = decoded;
      return decoded;
    }
  } catch(e) {
    console.warn("loadBuffer failed:", url, e);
    buffers[url] = null;
    return null;
  }
}

async function playUrl(url) {
  try {
    await ensureAudioContext();
    const buf = await loadBuffer(url);
    if (buf) {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(audioCtx.destination);
      src.start(0);
      return;
    }
  } catch(e) {
    console.warn("playUrl webaudio error", e);
  }
  // fallback to HTMLAudio
  try {
    const a = new Audio(url);
    a.volume = volume;
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    await a.play();
  } catch(e) {
    console.warn("fallback audio.play failed", e);
  }
}

// ----- UI events -----
openSettings.addEventListener("click", () => settingsPanel.classList.remove("hidden"));
closeSettings.addEventListener("click", () => settingsPanel.classList.add("hidden"));

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

// preview handler — MUST be called from user gesture (preview button click)
previewSound.addEventListener("click", async (ev) => {
  const url = soundSelect.value;
  if (!url) return;

  statusEl.textContent = "状態：プレビュー再生中...";

  try {
    // ★ iOS では「同一ユーザー操作内」に resume がないと絶対鳴らない
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();      // ← これが「クリックイベントの中」じゃないと iOS で無効
    }

    // ★ iOS で確実にオーディオ解禁させる儀式（無音1サンプル）
    try {
      const empty = audioCtx.createBuffer(1, 1, 22050);
      const src2  = audioCtx.createBufferSource();
      src2.buffer = empty;
      src2.connect(audioCtx.destination);
      src2.start(0);                // ← クリックイベント内なので解禁される
    } catch(e){}

    // --- ここから実音 ---
    const buf = await loadBuffer(url);

    if (buf) {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(audioCtx.destination);
      src.start(0);                 // ← クリックイベント内のため iOS 100%鳴る
      statusEl.textContent = "状態：準備完了";
      return;
    }
  } catch (e) {
    console.warn("iOS WebAudio preview fail", e);
  }

  // ★ WebAudio 失敗時の HTMLAudio fallback（これも同一タップ中であれば鳴る）
  try {
    const a = new Audio(url);
    a.volume = volume;
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    await a.play();                 // ← クリックイベント中なので再生可
    statusEl.textContent = "状態：準備完了";
    return;
  } catch (e) {
    console.warn("HTMLAudio fallback fail", e);
  }

  statusEl.textContent = "状態：プレビュー失敗";
  alert("プレビュー再生に失敗しました（URL / CORS / iOS制約）");
});


volumeSlider.addEventListener("input", () => { volume = Number(volumeSlider.value); });
sensitivitySlider.addEventListener("input", () => { sensitivity = Number(sensitivitySlider.value); });
rhythmMinEl.addEventListener("input", () => { rhythmMin = Number(rhythmMinEl.value); });
rhythmMaxEl.addEventListener("input", () => { rhythmMax = Number(rhythmMaxEl.value); });

saveSettingsBtn.addEventListener("click", () => {
  saveState();
  alert("設定を保存しました");
});

// ----- Motion detection -----
let lastAcc = { x: null, y: null, z: null };
let lastShakeTime = 0;
let shakeCount = 0;
let lastOrient = { alpha: null, beta: null, gamma: null };
let spinWindow = [];
let lastPlayedAt = {};
const THROTTLE_MS = 300;

function triggerAction(actionKey) {
  const now = Date.now();
  if (lastPlayedAt[actionKey] && now - lastPlayedAt[actionKey] < THROTTLE_MS) return;
  lastPlayedAt[actionKey] = now;
  const url = rules[actionKey];
  if (!url) return;
  playUrl(url).catch(()=>{});
}

function handleMotionEvent(e) {
  const acc = e.accelerationIncludingGravity || e.acceleration;
  if (!acc) return;
  const x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;

  if (lastAcc.x === null) {
    lastAcc = { x, y, z };
    return;
  }

  const diff = Math.abs(x - lastAcc.x) + Math.abs(y - lastAcc.y) + Math.abs(z - lastAcc.z);

  if (diff > sensitivity + 8) {
    triggerAction("shake");
  } else if (diff > Math.max(8, Math.floor(sensitivity / 2))) {
    triggerAction("smallShake");
  }

  if (diff > sensitivity) {
    const now = Date.now();
    const interval = now - lastShakeTime;
    if (interval > 30 && interval < 2000) {
      if (interval >= rhythmMin && interval <= rhythmMax) triggerAction("rhythmShake");
    }
    lastShakeTime = now;
    shakeCount++;
    countEl.textContent = shakeCount;
  }

  lastAcc = { x, y, z };
}

function handleOrientationEvent(e) {
  const a = e.alpha, b = e.beta, g = e.gamma;
  if (g != null) {
    if (g > 20) { triggerAction("tiltRight"); tiltEl.textContent = "右"; }
    else if (g < -20) { triggerAction("tiltLeft"); tiltEl.textContent = "左"; }
    else tiltEl.textContent = "まっすぐ";
  }
  if (b != null) {
    if (b < -30) triggerAction("faceUp");
    else if (b > 30) triggerAction("faceDown");
  }
  if (lastOrient.alpha != null && a != null) {
    const deltaA = Math.abs(a - lastOrient.alpha);
    const deltaB = (b != null && lastOrient.beta != null) ? Math.abs(b - lastOrient.beta) : 0;
    if (deltaA > 20) triggerAction("roll");
    if (deltaB > 20) triggerAction("pitch");
    const now = Date.now();
    const vel = deltaA;
    spinWindow.push({t: now, v: vel});
    while (spinWindow.length && now - spinWindow[0].t > 500) spinWindow.shift();
    const avgV = spinWindow.reduce((s,i)=>s+i.v,0)/Math.max(1, spinWindow.length);
    if (avgV > 25) triggerAction("spin");
  }
  lastOrient = { alpha: a, beta: b, gamma: g };
}

// ----- Start (user gesture) -----
async function startAll() {
  // unlock audio in user gesture
  await ensureAudioContext();
  await unlockAudioContext();
  statusEl.textContent = "状態：音声解禁済み";

  // NOTE: do NOT preload all buffers here (may hang on iOS). Load on demand.

  // request permission for iOS if required
  if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const p = await DeviceMotionEvent.requestPermission();
      let p2 = "granted";
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        p2 = await DeviceOrientationEvent.requestPermission();
      }
      if (p !== "granted" || p2 !== "granted") {
        statusEl.textContent = "状態：モーション許可が必要";
        alert("モーション許可が必要です（設定を許可してください）");
        return;
      }
    } catch(e) {
      console.warn("permission error", e);
    }
  }

  // attach listeners only once
  if (!listenersAttached) {
    window.addEventListener("devicemotion", handleMotionEvent);
    window.addEventListener("deviceorientation", handleOrientationEvent);
    listenersAttached = true;
  }

  statusEl.textContent = "状態：稼働中（振ってみてください）";
}

// ----- initial -----
loadState();
populateSoundSelect();
renderRules();

// start button
startBtn.addEventListener("click", async () => {
  // refresh UI-driven values
  volume = Number(volumeSlider.value);
  sensitivity = Number(sensitivitySlider.value);
  rhythmMin = Number(rhythmMinEl.value);
  rhythmMax = Number(rhythmMaxEl.value);

  await startAll();
});
