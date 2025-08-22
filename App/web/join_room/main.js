import { scanQRCode } from './scanner.js';

// Aggiungi questa funzione per popolare il dropdown delle fotocamere
async function populateCameraList() {
  const cameraList = document.getElementById('camera-list');
  
  try {
    // Prima richiesta per ottenere il permesso di accesso alle fotocamere
    const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Ferma subito lo stream, ci serve solo per avere accesso alle etichette
    initialStream.getTracks().forEach(track => track.stop());
    
    // Ora possiamo ottenere le etichette delle fotocamere
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Pulisci il dropdown
    cameraList.innerHTML = '';
    
    if (videoDevices.length === 0) {
      const option = document.createElement('option');
      option.text = 'Nessuna fotocamera disponibile';
      cameraList.add(option);
      cameraList.disabled = true;
      return;
    }
    
    // Aggiungi tutte le fotocamere al dropdown
    let hasBackCamera = false;
    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      
      // Crea un nome descrittivo
      let cameraName = device.label || `Fotocamera ${index + 1}`;
      
      // Aggiungi informazioni sul tipo di fotocamera
      if (cameraName.toLowerCase().includes('back')) {
        if (cameraName.toLowerCase().includes('ultra') || cameraName.toLowerCase().includes('wide')) {
          cameraName += ' (Grandangolare)';
        } else {
          cameraName += ' (Posteriore)';
          hasBackCamera = true;
        }
      } else if (cameraName.toLowerCase().includes('front')) {
        cameraName += ' (Frontale)';
      }
      
      option.text = cameraName;
      cameraList.add(option);
      
      // Se è una fotocamera posteriore standard, selezionala di default
      if (cameraName.includes('Posteriore') && 
          !cameraName.toLowerCase().includes('wide') && 
          !cameraName.toLowerCase().includes('ultra')) {
        cameraList.value = device.deviceId;
      }
    });
    
    // Se non abbiamo già selezionato una fotocamera, imposta la prima disponibile
    if (!cameraList.value && videoDevices.length > 0) {
      cameraList.value = videoDevices[0].deviceId;
    }
    
    cameraList.disabled = false;
    console.log("Lista fotocamere caricata");
    
  } catch (err) {
    console.error("Errore nell'accesso alle fotocamere:", err);
    cameraList.innerHTML = '<option value="">Errore accesso fotocamere</option>';
  }
}

// Chiama questa funzione quando la pagina si carica
document.addEventListener('DOMContentLoaded', populateCameraList);

async function main() {
  const videoElement = document.getElementById("video");
  const canvasElement = document.getElementById("canvas");
  const resultElement = document.getElementById("result");
  const cameraList = document.getElementById("camera-list");

  console.log("Attendo QR Code...");
  resultElement.innerText = "Richiedo accesso alla fotocamera...";

  try {
    // Usa la fotocamera selezionata dall'utente nel dropdown
    const constraints = {
      video: {
        advanced: [
          { zoom: 1 },
          { focusMode: "continuous" }
        ]
      },
      audio: false
    };
    
    // Se l'utente ha selezionato una fotocamera specifica, usala
    if (cameraList.value) {
      constraints.video.deviceId = { exact: cameraList.value };
      console.log(`Usando fotocamera selezionata: ${cameraList.options[cameraList.selectedIndex].text}`);
      resultElement.innerText = `Utilizzo fotocamera: ${cameraList.options[cameraList.selectedIndex].text}`;
    } else {
      // Fallback se non è stata selezionata una fotocamera specifica
      constraints.video.facingMode = "environment";
      console.log("Nessuna fotocamera specifica selezionata, utilizzo fotocamera posteriore predefinita");
    }

    // Otteniamo l'accesso alla fotocamera con i constraints specificati
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    resultElement.innerText = "Fotocamera attivata. Scansione QR Code in corso...";
    console.log("Inizializzo scanner QR Code...");

    // Disabilita il dropdown mentre lo scanner è attivo
    cameraList.disabled = true;
    document.getElementById("start-button").disabled = true;

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
    
    // Riabilita i controlli in caso di errore
    cameraList.disabled = false;
    document.getElementById("start-button").disabled = false;
  }
}

window.main = main; // export main to global scope so it can be called from HTML