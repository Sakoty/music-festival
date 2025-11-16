// ================================
//  localStorage から音を読み込む
// ================================
function loadSound(key, defaultUrl) {
  const data = localStorage.getItem(key);
  return new Audio(data || defaultUrl);
}

const soundNormal = loadSound("soundNormal",
  "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3"
);

const soundRhythm = loadSound("soundRhythm",
  "https://assets.mixkit.co/sfx/preview/mixkit-arcade-mechanical-bling-210.mp3"
);

const soundTiltLeft = loadSound("soundTiltLeft",
  "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3"
);

const soundTiltRight = loadSound("soundTiltRight",
  "https://assets.mixkit.co/sfx/preview/mixkit-arcade-space-shooter-dead-372.mp3"
);


// ================================
// 振り回数・傾き判定など（前回のまま）
// ================================
let shakeCount = 0;
let lastX = 0, lastY = 0, lastZ = 0;
let isFirst = true;
let lastShakeTime = 0;

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

function initMotion() {
  window.addEventListener("devicemotion", (event) => {
    const { x, y, z } = event.acceleration;

    if (isFirst) {
      lastX = x; lastY = y; lastZ = z;
      isFirst = false;
      return;
    }

    const diff = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);

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

    lastX = x; lastY = y; lastZ = z;
  });

  window.addEventListener("deviceorientation", (event) => {
    detectTilt(event.gamma);
  });
}

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
  alert("センサー有効化！振って・傾けてみてください！");
});
