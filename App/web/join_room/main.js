import { scanQRCode } from './scanner.js';

// Add this function to populate the camera dropdown
async function populateCameraList() {
  const cameraList = document.getElementById('camera-list');
  
  try {
    // Initial request to get permission to access cameras
    const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Immediately stop the stream, we only need it to access labels
    initialStream.getTracks().forEach(track => track.stop());
    
    // Now we can get the camera labels
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Clear the dropdown
    cameraList.innerHTML = '';
    
    if (videoDevices.length === 0) {
      const option = document.createElement('option');
      option.text = 'No cameras available';
      cameraList.add(option);
      cameraList.disabled = true;
      return;
    }
    
    // Add all cameras to the dropdown
    let hasBackCamera = false;
    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      
      // Create a descriptive name
      let cameraName = device.label || `Camera ${index + 1}`;
      
      // Add information about the camera type
      if (cameraName.toLowerCase().includes('back')) {
        if (cameraName.toLowerCase().includes('ultra') || cameraName.toLowerCase().includes('wide')) {
          cameraName += ' (Wide Angle)';
        } else {
          cameraName += ' (Rear)';
          hasBackCamera = true;
        }
      } else if (cameraName.toLowerCase().includes('front')) {
        cameraName += ' (Front)';
      }
      
      option.text = cameraName;
      cameraList.add(option);
      
      // If it's a standard rear camera, select it by default
      if (cameraName.includes('Rear') && 
          !cameraName.toLowerCase().includes('wide') && 
          !cameraName.toLowerCase().includes('ultra')) {
        cameraList.value = device.deviceId;
      }
    });
    
    // If no camera has been selected yet, set the first available one
    if (!cameraList.value && videoDevices.length > 0) {
      cameraList.value = videoDevices[0].deviceId;
    }
    
    cameraList.disabled = false;
    console.log("Camera list loaded");
    
  } catch (err) {
    console.error("Error accessing cameras:", err);
    cameraList.innerHTML = '<option value="">Error accessing cameras</option>';
  }
}

function disappearInstructions() {
  const instructions = document.getElementById("instructions");
  if (instructions) {
    instructions.style.display = "none";
  }

  // change the label of the selector to selected camera
  const label = document.getElementById("camera-list-label");
  label.innerText = "Selected Camera:";

  // Remove start button
  const startButton = document.getElementById("start-button");
  if (startButton) {
    startButton.style.display = "none";
  }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', populateCameraList);

async function main() {
  disappearInstructions();

  const videoElement = document.getElementById("video");
  const canvasElement = document.getElementById("canvas");
  const resultElement = document.getElementById("result");
  const cameraList = document.getElementById("camera-list");

  console.log("Waiting for QR Code...");
  resultElement.innerText = "Requesting camera access...";

  try {
    // Use the camera selected by the user in the dropdown
    const constraints = {
      facingMode: "environment",
      video: {
        advanced: [
          { zoom: 1 },
          { focusMode: "continuous" }
        ]
      },
      audio: false
    };
    
    // If the user has selected a specific camera, use it
    if (cameraList.value) {
      constraints.video.deviceId = { exact: cameraList.value };
      console.log(`Using selected camera: ${cameraList.options[cameraList.selectedIndex].text}`);
      resultElement.innerText = `Using camera: ${cameraList.options[cameraList.selectedIndex].text}`;
    } else {
      // Fallback if no specific camera has been selected
      constraints.video.facingMode = "environment";
      console.log("No specific camera selected, using default rear camera");
    }

    // Get access to the camera with the specified constraints
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    resultElement.innerText = "Camera activated. Scanning QR Code...";
    console.log("Initializing QR Code scanner...");

    // Disable the dropdown while the scanner is active
    cameraList.disabled = true;
    document.getElementById("start-button").disabled = true;

    // Pass the stream to the scanQRCode function
    const qrData = await scanQRCode(videoElement, canvasElement, resultElement, stream);
    console.log("QR Code received:", qrData);

    // Call the server to make the Join request with the data from the QRCODE
    const response = await requestJoinRoom(qrData);
    console.log("Response from server:", response);

    // If the server returns 200, start checking if the request has been approved
    if (response.status === 200) {
      console.log("Room join request sent successfully.");

      let roomDetails;
      // Try accessing room details to check when the other user has approved the join request
      do {
        roomDetails = await getRoomDetails(qrData);
        console.log("Room details:", roomDetails);
        // Wait one second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      } while (roomDetails.status !== 200);
      console.log("Room join request approved.");

      // Add the new chatroom to the IDB
      const roomsArray = [roomDetails.data.data];

      // Save rooms to IndexedDB
      const db = await DB.initDB();
      await DB.saveRoomsFromServer(db, roomsArray);

      // Open the chatroom
      window.location.href = `../chat/?roomId=${roomDetails.data.data.roomId}`;
    }

  } catch (err) {
    console.error("Scanner error:", err);
    resultElement.innerText = "Error: " + err.message;
    
    // Re-enable controls in case of error
    cameraList.disabled = false;
    document.getElementById("start-button").disabled = false;
  }
}

window.main = main; // export main to global scope so it can be called from HTML