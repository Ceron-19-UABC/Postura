function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                  Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const statusEl = document.getElementById('posture-status');

function setStatus(text, color) {
  statusEl.innerHTML = text;
  statusEl.style.backgroundColor = color;
}

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.poseLandmarks) {
    setStatus('No se detecta a nadie', 'rgba(0, 0, 0, 0.55)');
    canvasCtx.restore();
    return;
  }

  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
    { color: '#00FF00', lineWidth: 4 });
  drawLandmarks(canvasCtx, results.poseLandmarks,
    { color: '#FF0000', lineWidth: 2 });

  try {
    const landmarks = results.poseLandmarks;
    const leftEar = landmarks[7];
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];

    const visibilityThreshold = 0.3;
    if (leftShoulder.visibility < visibilityThreshold ||
        leftHip.visibility < visibilityThreshold ||
        leftKnee.visibility < visibilityThreshold) {
      setStatus('Colócate de lado y aléjate un poco', 'rgba(0, 0, 0, 0.55)');
      canvasCtx.restore();
      return;
    }

    const angleHip = calculateAngle(leftShoulder, leftHip, leftKnee);
    const angleKnee = calculateAngle(leftHip, leftKnee, leftAnkle);
    const angleBack = calculateAngle(leftEar, leftShoulder, leftHip);

    const sittingHipAngle = 130;
    const sittingKneeAngle = 130;
    const standingHipAngle = 160;
    const standingKneeAngle = 160;
    const goodPostureAngle = 165;

    const backAngleDisplay = Math.round(angleBack);
    const hipAngleDisplay = Math.round(angleHip);
    const kneeAngleDisplay = Math.round(angleKnee);

    if (angleHip > standingHipAngle && angleKnee > standingKneeAngle) {
      setStatus(`ESTADO: DE PIE<br>Espalda: ${backAngleDisplay}°`,
        'rgba(0, 150, 255, 0.60)');
    } else if (angleHip < sittingHipAngle && angleKnee < sittingKneeAngle) {
      const angleText = `Cadera: ${hipAngleDisplay}° | Rodilla: ${kneeAngleDisplay}°<br>Espalda: ${backAngleDisplay}°`;
      if (angleBack < goodPostureAngle) {
        setStatus(`POSTURA: INCORRECTA<br>${angleText}`,
          'rgba(255, 0, 0, 0.60)');
      } else {
        setStatus(`POSTURA: CORRECTA<br>${angleText}`,
          'rgba(0, 180, 0, 0.60)');
      }
    } else {
      setStatus(`ESTADO: TRANSICIÓN<br>Espalda: ${backAngleDisplay}°`,
        'rgba(128, 128, 128, 0.60)');
    }
  } catch (error) {
    console.error('Error al analizar la postura:', error);
    setStatus('Error de cálculo', 'rgba(0, 0, 0, 0.55)');
  }

  canvasCtx.restore();
}

const pose = new Pose({ locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera.start().catch((error) => {
  console.error('No se pudo iniciar la cámara:', error);
  setStatus('No se pudo abrir la cámara. Revisa permisos.', 'rgba(255, 0, 0, 0.60)');
});
