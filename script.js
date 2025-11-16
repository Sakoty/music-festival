// ================================
// 音の準備
// ================================
const soundNormal = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3");
const soundRhythm = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-arcade-mechanical-bling-210.mp3");
const soundTiltLeft = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3");
const soundTiltRight = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-arcade-space-shooter-dead-372.mp3");


// ================================
// 振った回数カウント
// ================================
let shakeCount = 0;
let lastX = 0, lastY = 0, lastZ = 0;
let isFirst = true;

// リズム用
let lastShakeTime = 0;


// ================================
// 傾き方向判定
// ================================
function detectTilt(gamma) {
  const tiltText = document.getElementById("tilt");

  if (gamma > 20) {
    tiltText.textContent = "右";
    soundTiltRight.play();
  } else if (gamma < -20) {
    tiltText.textContent = "左";
    soundTiltLeft.play();
  } else {
    tiltText.textContent = "まっすぐ";
  }
}


// ================================
// メイン処理
// ================================
function initMotion() {
  window.addEventListener("devicemotion", (event) => {

    // 加速度
    const { x, y, z } = event.acceleration;

    if (isFirst) {
      lastX = x; lastY = y; lastZ = z;
      isFirst = false;
      return;
    }

    // 振りの強さ
    const diff = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);

    // 強く動いたら "振った" と判定
    if (diff > 15) {

      const now = Date.now();

      // 振り回数カウント
      shakeCount++;
      document.getElementById("count").textContent = shakeCount;

      // -------------------------------
      // リズム判定：300〜600msなら別音
      // -------------------------------
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

    lastX = x; lastY = y; lastZ = z;
  });

  // -------------------------------
  // 傾き検出（DeviceOrientation）
  // -------------------------------
  window.addEventListener("deviceorientation", (event) => {
    const gamma = event.gamma; // 左右の傾き
    detectTilt(gamma);
  });
}


// ================================
// iOS 許可処理
// ================================
document.getElementById("start").addEventListener("click", async () => {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    const p1 = await DeviceMotionEvent.requestPermission();
    const p2 = await DeviceOrientationEvent.requestPermission();

    if (p1 !== "granted" || p2 !== "granted") {
      alert("センサーアクセスが拒否されました");
      return;
    }
  }

  initMotion();
  alert("センサーが有効化されました！振ったり傾けてみてください！");
});
