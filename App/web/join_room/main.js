import { scanQRCode } from './scanner.js';

async function main() {
  const videoElement = document.getElementById("video");
  const canvasElement = document.getElementById("canvas");
  const resultElement = document.getElementById("result");

  console.log("Attendo QR Code...");

  try {
    console.log("Inizializzo scanner QR Code...");
    const qrData = await scanQRCode(videoElement, canvasElement, resultElement);
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