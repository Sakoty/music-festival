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
//  iPhone Safari のための「音解禁処理」
//------------------------------------------------------
async function unlockAudio(audio) {
  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {
    console.log("Audio unlock failed:", e);
  }
}

//------------------------------------------------------
//  音の初期化（全音を iPhone に登録）
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

  // 🔥 iPhone で音を鳴らすために必須 — 全部1回再生して解禁
  await unlockAudio(soundNormal);
  await unlockAudio(soundRhythm);
  await unlockAudio(soundTiltLeft);
  await unlockAudio(soundTiltRight);
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

    const x = event.acceleration.x || 0;
    const y = event.acceleration.y || 0;
    const z = event.acceleration.z || 0;

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
  // iPhone
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const p1 = await DeviceMotionEvent.requestPermission();
      const p2 = await DeviceOrientationEvent.requestPermission();
      return p1 === "granted" && p2 === "granted";
    } catch {
      return false;
    }
  }

  // Android
  return true;
}


//------------------------------------------------------
//  スタートボタン
//------------------------------------------------------
document.getElementById("start").addEventListener("click", async () => {
  await initSounds();   // ←最重要！ボタン内で初期化

  const ok = await requestSensorPermission();
  if (!ok) {
    alert("センサーアクセスが許可されませんでした。");
    return;
  }

  initMotion();
  alert("センサーが有効になりました！振ったり傾けてみてください！");
});
