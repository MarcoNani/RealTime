export function scanQRCode(videoElement, canvasElement, resultElement) {
  return new Promise((resolve, reject) => {
    const video = videoElement;
    const canvas = canvasElement.getContext("2d");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // necessario per iOS
        video.play();

        function tick() {
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

            if (code) {
              // evidenzia il QR
              drawLine(code.location.topLeftCorner, code.location.topRightCorner, canvas);
              drawLine(code.location.topRightCorner, code.location.bottomRightCorner, canvas);
              drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, canvas);
              drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, canvas);

              resultElement.innerText = `QR Code: ${code.data}`;

              // ferma la fotocamera
              stream.getTracks().forEach(track => track.stop());

              resolve(code.data);
              return;
            } else {
              resultElement.innerText = "In attesa di QR Code...";
            }
          }
          requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      })
      .catch(err => reject(err));
  });
}

function drawLine(begin, end, canvas) {
  canvas.beginPath();
  canvas.moveTo(begin.x, begin.y);
  canvas.lineTo(end.x, end.y);
  canvas.lineWidth = 4;
  canvas.strokeStyle = "red";
  canvas.stroke();
}
