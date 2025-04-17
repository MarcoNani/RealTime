const socket = io({ path: "/socket.io" });
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const usernameInput = document.getElementById("username");
const setUsernameBtn = document.getElementById("setUsername");
const autoScrollToggle = document.getElementById("autoScrollToggle");
const apikeyInput = document.getElementById("apiKey");
const roomIdInput = document.getElementById("roomId");


function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}


let authStatus = false; // Stato di autenticazione

let username = "";
let apiKey = "";
let roomId = "";
let currentMessageID = undefined;
let send = true;

let messageDictionary = {};

// Funzione per ottenere i parametri dall'URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  console.debug(urlParams);
  return urlParams.get(param);
}

// Leggi la apiKey dall'URL e impostala come valore di default
apiKey = getQueryParam("apiKey") || "";
apikeyInput.value = apiKey;

roomId = getQueryParam("roomId") || "";
roomIdInput.value = roomId;


// Funzione per scrollare verso il basso
function scrollToBottom() {
  if (autoScrollToggle.checked) {
    console.debug("Scrolling to bottom");
    chat.scrollTop = chat.scrollHeight;
  }
}

// Quando ci si collega al server il server gli si invia la apiKey nell'header
// Il server ci chiede di autenticarci
// A questo punto noi gli inviamo la apiKey
// Il server ci risponde con lo stato di autenticazione
// Se l'autenticazione va a buon fine rimaniamo in attesa di ricevere messaggi e possiamo inviare i nostri messaggi

socket.on("connect", () => {
  // Quando ci si collega al server
  console.log("Connected to server"); // Mostra un messaggio di connessione
  console.log("Sending API Key:", apiKey);
  socket.emit("auth", { apiKey: apiKey }); // Invia la apiKey al server
});

socket.on("authSuccess", (message) => {
  // Quando l'autenticazione va a buon fine
  console.info("Authentication successful, recieved:", message); // Mostra un messaggio di successo

  authStatus = true; // Imposta lo stato di autenticazione a true

  requestMessageId(roomId); // Richiede l'id del messaggio
});

socket.on("authFailed", (error) => {
  // Quando l'autenticazione fallisce
  console.error("Authentication failed:", error); // Mostra un messaggio di errore
});



function requestMessageId(roomId) {
  if (authStatus) {
    // Se l'autenticazione è andata a buon fine
    // Richiedo l'id del messaggio (voglio inziare a scrivere)

    let messageIdPayload = {
      sendId: uuidv4(),
      roomId: roomId
    };

    console.log("Requesting message ID with payload:", messageIdPayload); // Mostra il payload
    socket.emit("messageId", messageIdPayload); // Invia la richiesta al server
  }
}

socket.on("messageId", (payload) => {
  // Quando si riceve l'id del messaggio
  console.info("Received message ID:", payload); // Mostra l'id del messaggio
  currentMessageID = payload.messageId; // Imposta l'id del messaggio corrente

  typing(); // Inizia a scrivere un messaggio

  setTimeout(finish, 1000); // Invia il messaggio finale dopo 1 secondo
});

socket.on("ack", (payload) => {
  // Quando si riceve l'id del messaggio
  console.info("Received ack message:", payload); // Mostra l'id del messaggio
});


function typing() { // Funzione per scrivere un messaggio
  const message_obj = {
    sendId: uuidv4(), // Genera un id univoco per il messaggio
    messageId: currentMessageID, // Imposta l'id del messaggio corrente
    roomId: roomId, // Imposta l'id della stanza
    payload: "test...",
  };

  console.log("Sending typing message with local message id:", message_obj); // Mostra il messaggio

  socket.emit("typing", message_obj); // Invia il messaggio al server
}


function finish() { // Funzione per scrivere un messaggio
  const message_obj = {
    sendId: uuidv4(), // Genera un id univoco per il messaggio
    messageId: currentMessageID, // Imposta l'id del messaggio corrente
    roomId: roomId, // Imposta l'id della stanza
    payload: "testo finale",
  };

  console.log("Sending finish message with local message id:", message_obj); // Mostra il messaggio

  socket.emit("finish", message_obj); // Invia il messaggio al server
}




socket.on("finish", (payload) => {
  // Quando si riceve un messaggio di scrittura
  console.warn("Ricevuta una versione finale:", payload); // Mostra l'id del messaggio
});


socket.on("typing", (payload) => {
  // Quando si riceve un messaggio di scrittura
  console.warn("Ricevuto un typing:", payload); // Mostra l'id del messaggio
});

//input.addEventListener("input", typing());


/*

setUsernameBtn.addEventListener("click", () => {
  // Quando si clicca sul bottone per cambiare nome
  const newName = usernameInput.value.trim(); // Prende il nuovo nome
  if (newName) {
    // Se il nome non è vuoto
    socket.emit("setUsername", newName); // Invia il nuovo nome al server
    username = newName; // Imposta la variabile con il nuovo nome
  }
});

input.addEventListener("input", () => {
  // Quando si scrive nel campo di input
  const message_obj = { payload: input.value, id: currentMessageID, api_key: apiKey }; // crea oggetto messaggio
  if (send) {
    if (currentMessageID == undefined) {
      send = false;
    }
    socket.emit("typing", message_obj); // Invia il messaggio di scrittura al server
    console.log("Sending message with local message id: " + message_obj.msg_id);
  }
});

socket.on("display", (message_obj) => {
  // Riceve il messaggio da visualizzare
  console.log(message_obj);

  if (message_obj === "Hacker") {
    // Se il messaggio è "Hacker"
    alert("Hai provato a hackerare il sistema!"); // Mostra un alert
    return; // Esce dalla funzione
  }

  // Aggiorna l'id del messaggio corrente con quello ricevuto se è il mio messaggio
  if (message_obj.name === username) {
    currentMessageID = message_obj.msg_id; // Imposta l'id del messaggio corrente come quello del messaggio appena ricevuto
    if (!send) {
      socket.emit("typing", message_obj); // Invia il messaggio di scrittura al server
      console.log(
        "Sending message with local message id: " + message_obj.msg_id
      );
    }
    send = true;
  }

  // Controlla se il messaggio è già stato visualizzato
  if (messageDictionary[message_obj.msg_id]) {
    // Se il messaggio è già presente, aggiorna il suo contenuto
    const existingMessage = document.getElementById(
      `msg-${message_obj.msg_id}`
    );
    if (existingMessage) {
      existingMessage.innerHTML = generateTextMessage(message_obj);
    }
  } else {
    // Se il messaggio è nuovo, lo aggiunge alla chat
    const messageElement = document.createElement("p");
    messageElement.id = `msg-${message_obj.msg_id}`; // Aggiunge un id univoco per il messaggio
    messageElement.innerHTML = generateTextMessage(message_obj);

    // Aggiunge il messaggio alla chat
    chat.appendChild(messageElement);

    // Aggiunge il messaggio al dizionario per tenere traccia di quello già visualizzato
    messageDictionary[message_obj.msg_id] = message_obj;
  }

  scrollToBottom(); // Scrolla verso il basso
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    // Se si preme il tasto Invio
    // imposta a undefined l'id del messaggio corrente
    currentMessageID = undefined;
    input.value = ""; // ripulisci il campo di input
  }
});

*/