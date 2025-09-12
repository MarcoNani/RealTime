export function scanQRCode(videoElement, canvasElement, resultElement, stream) {
  return new Promise((resolve, reject) => {
    const video = videoElement;
    const canvas = canvasElement.getContext("2d");

    // Use the already obtained stream instead of requesting new permissions
    video.srcObject = stream;
    video.setAttribute("playsinline", true); // necessary for iOS
    video.play();

    function tick() {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code) {
          // Found a QR code
          // Validate QR code content
          // If valid stop else continue scanning

          console.log("QR Code Data (raw):", code.data);

          const regex = /^[a-fA-F0-9]{32}\|[A-Za-z0-9+/=]+$/;
          if (regex.test(code.data.trim())) {
            // QR code content is valid
            console.log("Valid QR code content.");

            // trim the result to avoid issues with padding
            const trimmedData = code.data.trim();

            console.log("QR Code Data (trimmed):", trimmedData);

            // Highlight the QR code
            drawLine(code.location.topLeftCorner, code.location.topRightCorner, canvas);
            drawLine(code.location.topRightCorner, code.location.bottomRightCorner, canvas);
            drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, canvas);
            drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, canvas);

            resultElement.innerText = `QR Code read successfully.`;

            // Stop the camera
            stream.getTracks().forEach(track => track.stop());

            resolve(trimmedData);
            return;
          } else {
            console.log("Invalid QR code content, continuing scan...");
          }
        } else {
          resultElement.innerText = "Waiting for QR Code...";
        }
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
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
