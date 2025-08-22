import { scanQRCode } from './scanner.js';

async function main() {
  const videoElement = document.getElementById("video");
  const canvasElement = document.getElementById("canvas");
  const resultElement = document.getElementById("result");

  console.log("Attendo QR Code...");
  resultElement.innerText = "Richiedo accesso alla fotocamera...";

  try {
    // Prima otteniamo la lista di tutte le fotocamere disponibili
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log("Fotocamere disponibili:", videoDevices);
    
    // Imposta constraints base per selezionare la fotocamera posteriore
    const constraints = {
      video: {
        facingMode: "environment", // Fotocamera posteriore come fallback base
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [
          { zoom: 1 },
          { focusMode: "continuous" }
        ]
      },
      audio: false
    };
    
    // Se abbiamo accesso alle etichette dei dispositivi (richiede permessi già concessi)
    if (videoDevices.length > 0 && videoDevices[0].label) {
      let selectedCamera = null;
      
      // PRIORITÀ 1: Cerca una fotocamera posteriore non grandangolare
      selectedCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes("back") && 
        !device.label.toLowerCase().includes("wide") &&
        !device.label.toLowerCase().includes("ultra")
      );
      
      // PRIORITÀ 2: Se non trovata, cerca qualsiasi fotocamera posteriore
      if (!selectedCamera) {
        selectedCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes("back")
        );
        if (selectedCamera) {
          console.log("Fotocamera standard non trovata, uso fotocamera posteriore:", selectedCamera.label);
        }
      }
      
      // PRIORITÀ 3: Se ancora non trovata, usa la prima fotocamera disponibile
      if (!selectedCamera && videoDevices.length > 0) {
        selectedCamera = videoDevices[0];
        console.log("Fotocamera posteriore non trovata, uso fotocamera predefinita:", selectedCamera.label);
      }
      
      // Se abbiamo trovato una fotocamera, impostiamo il deviceId
      if (selectedCamera) {
        constraints.video.deviceId = { exact: selectedCamera.deviceId };
        console.log("Selezionata fotocamera:", selectedCamera.label);
        resultElement.innerText = `Utilizzo fotocamera: ${selectedCamera.label}`;
      } else {
        console.log("Nessuna fotocamera identificabile trovata, uso impostazioni predefinite");
        resultElement.innerText = "Utilizzo fotocamera predefinita...";
      }
    } else {
      console.log("Informazioni sulle fotocamere non disponibili, uso impostazioni predefinite");
    }

    // Otteniamo l'accesso alla fotocamera con i constraints specificati
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    resultElement.innerText = "Fotocamera attivata. Scansione QR Code in corso...";
    console.log("Inizializzo scanner QR Code...");

    // Passiamo lo stream alla funzione scanQRCode
    const qrData = await scanQRCode(videoElement, canvasElement, resultElement, stream);
    console.log("QR Code ricevuto:", qrData);

    // Call the server to make the Join request with the data from the QRCODE
    const response = await requestJoinRoom(qrData);
    console.log("Risposta dal server:", response);

    // se il server ritorna 200 inizio a provare a vedere se la richiesta è stata approvata
    if (response.status === 200) {
      console.log("Richiesta di accesso alla stanza inviata con successo.");

      let roomDetails;
      // try accessing room details to check when the other user have approved my join request
      do {
        roomDetails = await getRoomDetails(qrData);
        console.log("Dettagli della stanza:", roomDetails);
        // aspetto un secondo prima di riprovare
        await new Promise(resolve => setTimeout(resolve, 1000));
      } while (roomDetails.status !== 200);
      console.log("Richiesta di accesso alla stanza approvata.");

      // Add the new chatroom the the IDB

      // il db si aspetta una rray contenente i dettagli di varie stanze ma noi abbiamo solo una stanza
      const roomsArray = [roomDetails.data.data];

      // Save rooms to IndexedDB
      const db = await DB.initDB();
      await DB.saveRoomsFromServer(db, roomsArray);

      // Open the chatroom
      window.location.href = `../chat/?roomId=${roomDetails.data.data.roomId}`;
    }

  } catch (err) {
    console.error("Errore scanner:", err);
    resultElement.innerText = "Errore: " + err.message;
  }
}

window.main = main; // export main to global scope so it can be called from HTML