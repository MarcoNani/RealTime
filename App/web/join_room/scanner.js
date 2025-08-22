export function scanQRCode(videoElement, canvasElement, resultElement, stream) {
  return new Promise((resolve, reject) => {
    const video = videoElement;
    const canvas = canvasElement.getContext("2d", { alpha: false }); // Optimization for rendering
    let lastProcessingTime = 0;
    const processingInterval = 200; // Process complex QR codes every 200ms

    // Utilizziamo lo stream già ottenuto invece di richiedere nuovi permessi
    video.srcObject = stream;
    video.setAttribute("playsinline", true); // necessario per iOS
    video.play();

    function tick() {
      const now = performance.now();
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Always update display for smooth video
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        
        // Process QR code at intervals
        if (now - lastProcessingTime >= processingInterval) {
          lastProcessingTime = now;
          
          // Use try-catch to prevent crashes from heavy processing
          try {
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
            }
          } catch (err) {
            console.error("Error processing frame:", err);
          }
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
