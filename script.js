//------------------------------------------------------
//  localStorage から音を読み込む
//------------------------------------------------------
function loadSound(key, defaultUrl) {
  const data = localStorage.getItem(key);
  const audio = new Audio(data || defaultUrl);
  audio.preload = "auto";
  return audio;
}

let soundNormal;
let soundRhythm;
let soundTiltLeft;
let soundTiltRight;


//------------------------------------------------------
//  音の初期化（音ファイル読み込み）
//------------------------------------------------------
async function initSounds() {
  soundNormal = loadSound(
    "soundNormal",
    "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3"
  );
  soundRhythm = loadSound(
    "soundRhythm",
    "https://assets.mixkit.co/sfx/preview/mixkit-arcade-mechanical-bling-210.mp3"
  );
  soundTiltLeft = loadSound(
    "soundTiltLeft",
    "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3"
  );
  soundTiltRight = loadSound(
    "soundTiltRight",
    "https://assets.mixkit.co/sfx/preview/mixkit-arcade-space-shooter-dead-372.mp3"
  );
}


//------------------------------------------------------
//  傾き方向判定
//------------------------------------------------------
function detectTilt(gamma) {
  const tiltText = document.getElementById("tilt");

  if (gamma > 20) {
    tiltText.textContent = "右";
    soundTiltRight.currentTime = 0;
    soundTiltRight.play();
  } else if (gamma < -20) {
    tiltText.textContent = "左";
    soundTiltLeft.currentTime = 0;
    soundTiltLeft.play();
  } else {
    tiltText.textContent = "まっすぐ";
  }
}


//------------------------------------------------------
//  振り検出
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

    const diff =
      Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);

    if (diff > 15) {
      const now = Date.now();
      shakeCount++;
      document.getElementById("count").textContent = shakeCount;

      const interval = now - lastShakeTime;

      if (interval > 300 && interval < 600) {
        document.getElementById("rhythm").textContent = "いいリズム🎵";
        soundRhythm.currentTime = 0;
        soundRhythm.play();
      } else {
        document.getElementById("rhythm").textContent = "-";
        soundNormal.currentTime = 0;
        soundNormal.play();
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
//  iOS / Android 両対応パーミッション
//------------------------------------------------------
async function requestSensorPermission() {
  // iPhone Safari
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

  // iPhone Chrome / Android
  return true;
}


//------------------------------------------------------
//  スタートボタン（iPhoneで音が確実に鳴る版）
//------------------------------------------------------
document.getElementById("start").addEventListener("click", async () => {
  // -------- 無音を 1 回鳴らして iPhone の音を解禁 --------
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const emptyBuffer = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = emptyBuffer;
  src.connect(ctx.destination);
  src.start(0);

  // -------- 音読み込み --------
  await initSounds();

  // -------- センサー許可 --------
  const ok = await requestSensorPermission();
  if (!ok) {
    alert("センサーアクセスが許可されませんでした。");
    return;
  }

  // -------- モーション開始 --------
  initMotion();
  alert("センサーが有効になりました！振ったり傾けてみてください！");
});
