//------------------------------------------------------
// WebAudio 初期化
//------------------------------------------------------
let audioCtx;
let buffers = {};

async function loadAudioBuffer(url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

function playBuffer(name) {
  const src = audioCtx.createBufferSource();
  src.buffer = buffers[name];
  src.connect(audioCtx.destination);
  src.start(0);
}


//------------------------------------------------------
// 音読み込み（WebAudio）
//------------------------------------------------------
async function initSounds() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  buffers.normal = await loadAudioBuffer(
    localStorage.getItem("soundNormal") ||
      "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3"
  );

  buffers.rhythm = await loadAudioBuffer(
    localStorage.getItem("soundRhythm") ||
      "https://assets.mixkit.co/sfx/preview/mixkit-arcade-mechanical-bling-210.mp3"
  );

  buffers.left = await loadAudioBuffer(
    localStorage.getItem("soundTiltLeft") ||
      "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3"
  );

  buffers.right = await loadAudioBuffer(
    localStorage.getItem("soundTiltRight") ||
      "https://assets.mixkit.co/sfx/preview/mixkit-arcade-space-shooter-dead-372.mp3"
  );
}


//------------------------------------------------------
// 傾き
//------------------------------------------------------
function detectTilt(gamma) {
  const tiltText = document.getElementById("tilt");

  if (gamma > 20) {
    tiltText.textContent = "右";
    playBuffer("right");
  } else if (gamma < -20) {
    tiltText.textContent = "左";
    playBuffer("left");
  } else {
    tiltText.textContent = "まっすぐ";
  }
}


//------------------------------------------------------
// シェイク検出
//------------------------------------------------------
let shakeCount = 0;
let lastX = null, lastY = null, lastZ = null;
let lastShakeTime = 0;

function initMotion() {
  window.addEventListener("devicemotion", (event) => {
    if (!event.acceleration) return;
    const { x = 0, y = 0, z = 0 } = event.acceleration;

    if (lastX === null) {
      lastX = x; lastY = y; lastZ = z;
      return;
    }

    const diff = Math.abs(x-lastX) + Math.abs(y-lastY) + Math.abs(z-lastZ);

    if (diff > 15) {
      const now = Date.now();
      shakeCount++;
      document.getElementById("count").textContent = shakeCount;

      const interval = now - lastShakeTime;
      if (interval > 300 && interval < 600) {
        document.getElementById("rhythm").textContent = "いいリズム🎵";
        playBuffer("rhythm");
      } else {
        document.getElementById("rhythm").textContent = "-";
        playBuffer("normal");
      }
      lastShakeTime = now;
    }

    lastX = x;
    lastY = y;
    lastZ = z;
  });

  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    detectTilt(e.gamma);
  });
}


//------------------------------------------------------
// iOS/Android センサー許可
//------------------------------------------------------
async function requestSensorPermission() {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const p1 = await DeviceMotionEvent.requestPermission();

      let p2 = "granted";
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        p2 = await DeviceOrientationEvent.requestPermission();
      }

      return p1 === "granted" && p2 === "granted";
    } catch {
      return false;
    }
  }
  return true;
}


//------------------------------------------------------
// start ボタン
//------------------------------------------------------
document.getElementById("start").addEventListener("click", async () => {

  // ★ iPhone ですぐに WebAudio を有効化
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();

  await initSounds();

  const ok = await requestSensorPermission();
  if (!ok) {
    alert("センサーアクセスが許可されませんでした");
    return;
  }

  initMotion();
  alert("センサーが有効になりました！");
});
