let shakeSound;
let tiltSound;

async function unlockAudio(sound) {
  try {
    await sound.play();
    sound.pause();
    sound.currentTime = 0;
  } catch (e) {
    console.log("unlock failed:", e);
  }
}

document.getElementById("startBtn").addEventListener("click", async () => {

  //---------------------------------------
  // ① iPhone音解禁（必ずクリック内）
  //---------------------------------------
  shakeSound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3");
  tiltSound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3");

  await unlockAudio(shakeSound);
  await unlockAudio(tiltSound);

  //---------------------------------------
  // ② iPhoneのセンサーパーミッション
  //---------------------------------------
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    const p1 = await DeviceMotionEvent.requestPermission();
    const p2 = await DeviceOrientationEvent.requestPermission();
    if (p1 !== "granted" || p2 !== "granted") {
      alert("センサー許可が必要です");
      return;
    }
  }

  //---------------------------------------
  // ③ モーションセンサー開始
  //---------------------------------------
  let lastX = null, lastY = null, lastZ = null;
  let shakeCounter = 0;

  window.addEventListener("devicemotion", (e) => {
    if (!e.acceleration) return;

    const x = e.acceleration.x || 0;
    const y = e.acceleration.y || 0;
    const z = e.acceleration.z || 0;

    if (lastX !== null) {
      const diff = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);

      if (diff > 15) {
        shakeCounter++;
        document.getElementById("shake").textContent = shakeCounter;

        shakeSound.currentTime = 0;
        shakeSound.play();
      }
    }

    lastX = x;
    lastY = y;
    lastZ = z;
  });

  //---------------------------------------
  // ④ 傾き
  //---------------------------------------
  window.addEventListener("deviceorientation", (e) => {
    const g = e.gamma;
    if (g == null) return;

    if (g > 20) {
      document.getElementById("tilt").textContent = "右";
      tiltSound.currentTime = 0;
      tiltSound.play();
    } else if (g < -20) {
      document.getElementById("tilt").textContent = "左";
      tiltSound.currentTime = 0;
      tiltSound.play();
    } else {
      document.getElementById("tilt").textContent = "まっすぐ";
    }
  });

  alert("準備OK！振ったり傾けてください");
});
