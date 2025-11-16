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
//  初期化（ボタンを押した瞬間に音を初期再生）
//------------------------------------------------------
function initSounds() {
  soundNormal = loadSound("soundNormal",
    "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3"
  );
  soundRhythm = loadSound("soundRhythm",
    "https://assets.mixkit.co/sfx/preview/mixkit-arcade-mechanical-bling-210.mp3"
  );
  soundTiltLeft = loadSound("soundTiltLeft",
    "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3"
  );
  soundTiltRight = loadSound("soundTiltRight",
    "https://assets.mixkit.co/sfx/preview/mixkit-arcade-space-shooter-dead-372.mp3"
  );

  // 重要：最初に１回再生しておく（iOS 初期化）
  soundNormal.play().then(() => {
    soundNormal.pause();
    soundNormal.currentTime = 0;
  });
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
//  モーション検出
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

    const diff = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);

    // 強く振ったとき
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

  // 傾き
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    detectTilt(e.gamma);
  });
}


//------------------------------------------------------
//  iOS / Android 両対応のパーミッション処理
//------------------------------------------------------
async function requestSensorPermission() {
  // iOS
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const p1 = await DeviceMotionEvent.requestPermission();
      const p2 = await DeviceOrientationEvent.requestPermission();
      return p1 === "granted" && p2 === "granted";
    } catch {
      return false;
    }
  }

  // Android → そのまま許可とみなす
  return true;
}


//------------------------------------------------------
//  スタートボタン
//------------------------------------------------------
document.getElementById("start").addEventListener("click", async () => {
  // 音の初期化
  initSounds();

  const ok = await requestSensorPermission();

  if (!ok) {
    alert("センサーアクセスが許可されませんでした。");
    return;
  }

  initMotion();
  alert("センサーが有効になりました！振ったり傾けてみてください！");
});
