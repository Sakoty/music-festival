// ================================
// Safari対応・完全安定版  script.js
// ================================

// ----------------------------------
// WebAudio（Safari用）
// ----------------------------------
let audioCtx = null;
async function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  return audioCtx;
}

// 空のバッファを一瞬鳴らして iOS の音解禁
async function unlockAudioContext() {
  await ensureAudio();
  try {
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch (e) {
    console.warn("unlock error", e);
  }
}

// ----------------------------------
// 音のロード
// ----------------------------------
const buffers = {}; // url → AudioBuffer or null

async function loadBuffer(url) {
  if (buffers[url] !== undefined) return buffers[url];

  await ensureAudio();

  try {
    const res = await fetch(url, { mode: "cors" });
    const ab = await res.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(ab);
    buffers[url] = decoded;
    return decoded;
  } catch (e) {
    console.warn("loadBuffer failed", e);
    buffers[url] = null;
    return null;
  }
}

// ----------------------------------
// 再生
// ----------------------------------
async function playSound(url, volume = 1.0) {
  await ensureAudio();

  const buf = await loadBuffer(url);
  if (buf) {
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    src.buffer = buf;
    src.connect(gain).connect(audioCtx.destination);
    src.start();
    return;
  }

  // fallback
  try {
    const a = new Audio(url);
    a.volume = volume;
    await a.play();
  } catch (e) {
    console.warn("fallback failed", e);
  }
}

// ----------------------------------
// データ
// ----------------------------------
const DEFAULT_SOUNDS = [
  { name: "ポン", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_5a89b19331.mp3" },
  { name: "コイン", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_9c650c3aef.mp3" },
  { name: "ポップ", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_0c07ad012a.mp3" },
  { name: "クリック", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_b77dae1f3d.mp3" }
];

const ACTIONS = {
  shake: "強いシェイク",
  smallShake: "弱いシェイク",
  rhythmShake: "リズム良いシェイク",
  tiltRight: "右に傾ける",
  tiltLeft: "左に傾ける",
  faceUp: "上向き",
  faceDown: "下向き",
  roll: "回転",
  pitch: "縦ゆれ",
  spin: "高速スピン"
};

let soundList = [];
let rules = {};

let volume = 1;
let sensitivity = 20;
let rhythmMin = 300;
let rhythmMax = 600;

// ----------------------------------
// localStorage
// ----------------------------------
function loadState() {
  const sl = localStorage.getItem("sounds");
  const rl = localStorage.getItem("rules");
  soundList = sl ? JSON.parse(sl) : DEFAULT_SOUNDS.slice();
  rules = rl ? JSON.parse(rl) : {};
}
function saveState() {
  localStorage.setItem("sounds", JSON.stringify(soundList));
  localStorage.setItem("rules", JSON.stringify(rules));
}

// ----------------------------------
// UI
// ----------------------------------
const startBtn = document.getElementById("startBtn");
const previewBtn = document.getElementById("previewSound");
const soundSelect = document.getElementById("soundSelect");
const actionSelect = document.getElementById("actionSelect");
const assignBtn = document.getElementById("assignBtn");
const rulesList = document.getElementById("rulesList");
const statusEl = document.getElementById("status");

const volSlider = document.getElementById("volume");
const sensSlider = document.getElementById("sensitivity");
const rhythmMinEl = document.getElementById("rhythmMin");
const rhythmMaxEl = document.getElementById("rhythmMax");

const countEl = document.getElementById("count");
const tiltEl = document.getElementById("tilt");

// ----------------------------------
// UIセットアップ
// ----------------------------------
function refreshSoundSelect() {
  soundSelect.innerHTML = "";
  soundList.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.url;
    opt.textContent = s.name;
    soundSelect.appendChild(opt);
  });
}

function refreshRules() {
  rulesList.innerHTML = "";
  for (const key in ACTIONS) {
    const li = document.createElement("li");
    const name = ACTIONS[key];
    const assigned = rules[key] || "-";
    li.innerHTML = `${name} → ${assigned}`;
    rulesList.appendChild(li);
  }
}

// ----------------------------------
// プレビュー音（ここが Safari の最大鬼門）
// ----------------------------------
previewBtn.addEventListener("click", async () => {
  const url = soundSelect.value;
  await ensureAudio();
  await unlockAudioContext(); // ← Safariではこれがないと99%鳴らない
  statusEl.textContent = "再生中...";
  await playSound(url, volume);
  statusEl.textContent = "準備完了";
});

// ----------------------------------
// 割り当て
// ----------------------------------
assignBtn.addEventListener("click", () => {
  const key = actionSelect.value;
  const url = soundSelect.value;
  rules[key] = url;
  saveState();
  refreshRules();
  alert("割り当てました！");
});

// ----------------------------------
// Motion detection（完全安定版）
// ----------------------------------
let lastAcc = { x: null, y: null, z: null };
let lastShakeTime = 0;
let shakeCount = 0;
let lastOrient = { alpha: null, beta: null, gamma: null };

function trigger(key) {
  const url = rules[key];
  if (!url) return;
  playSound(url, volume);
}

window.addEventListener("devicemotion", (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;

  const x = acc.x || 0,
    y = acc.y || 0,
    z = acc.z || 0;

  if (lastAcc.x === null) {
    lastAcc = { x, y, z };
    return;
  }

  const diff =
    Math.abs(x - lastAcc.x) +
    Math.abs(y - lastAcc.y) +
    Math.abs(z - lastAcc.z);

  if (diff > sensitivity + 8) trigger("shake");
  else if (diff > sensitivity / 2) trigger("smallShake");

  if (diff > sensitivity) {
    const now = Date.now();
    const interval = now - lastShakeTime;
    if (interval >= rhythmMin && interval <= rhythmMax) {
      trigger("rhythmShake");
    }
    lastShakeTime = now;
    shakeCount++;
    countEl.textContent = shakeCount;
  }

  lastAcc = { x, y, z };
});

window.addEventListener("deviceorientation", (e) => {
  const g = e.gamma;
  const b = e.beta;

  if (g != null) {
    if (g > 20) {
      tiltEl.textContent = "右";
      trigger("tiltRight");
    } else if (g < -20) {
      tiltEl.textContent = "左";
      trigger("tiltLeft");
    } else {
      tiltEl.textContent = "まっすぐ";
    }
  }

  if (b != null) {
    if (b < -30) trigger("faceUp");
    if (b > 30) trigger("faceDown");
  }
});

// ----------------------------------
// Start ボタン（ここで unlock + permission）
// ----------------------------------
startBtn.addEventListener("click", async () => {
  await ensureAudio();
  await unlockAudioContext(); // ← Safari対策の最重要
  statusEl.textContent = "音OK！";

  // ↓ iOS16.1 は requestPermission が要らないのでそのままOK
  statusEl.textContent = "動作中（振ってください）";
});

// ----------------------------------
// 初期読込
// ----------------------------------
loadState();
refreshSoundSelect();
refreshRules();
