const socket = io();
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const usernameInput = document.getElementById("username");
const setUsernameBtn = document.getElementById("setUsername");
const autoScrollToggle = document.getElementById("autoScrollToggle");

let username = "";
let currentMessageID = undefined;
let send = true;

let messageDictionary = {};


// Funzione per scrollare verso il basso
function scrollToBottom() {
    if (autoScrollToggle.checked) {
        console.log("Scrolling to bottom");
        chat.scrollTop = chat.scrollHeight;
    }
}

socket.on("setUsername", (name) => { // Riceve il proprio username
    username = name; // Imposta la variabile con il proprio username
    usernameInput.value = name; // Imposta il campo di input con il proprio username
});

setUsernameBtn.addEventListener("click", () => { // Quando si clicca sul bottone per cambiare nome
    const newName = usernameInput.value.trim(); // Prende il nuovo nome
    if (newName) { // Se il nome non è vuoto
        socket.emit("setUsername", newName); // Invia il nuovo nome al server
        username = newName; // Imposta la variabile con il nuovo nome
    }
});

input.addEventListener("input", () => { // Quando si scrive nel campo di input
    const message_obj = { text: input.value, msg_id: currentMessageID }; // crea oggetto messaggio
    if (send){
        if (currentMessageID==undefined){
            send = false;
        }
        socket.emit("typing", message_obj); // Invia il messaggio di scrittura al server
        console.log ( "Sending message with local message id: " + message_obj.msg_id);
    }
});

socket.on("display", (message_obj) => { // Riceve il messaggio da visualizzare
    console.log(message_obj);

    if (message_obj === "Hacker") { // Se il messaggio è "Hacker"
        alert("Hai provato a hackerare il sistema!"); // Mostra un alert
        return; // Esce dalla funzione
    }

    // Aggiorna l'id del messaggio corrente con quello ricevuto se è il mio messaggio
    if (message_obj.name === username) {
        currentMessageID = message_obj.msg_id; // Imposta l'id del messaggio corrente come quello del messaggio appena ricevuto
        if (!send){
            socket.emit("typing", message_obj); // Invia il messaggio di scrittura al server
            console.log ( "Sending message with local message id: " + message_obj.msg_id);
        }
        send = true;
    }

    // Controlla se il messaggio è già stato visualizzato
    if (messageDictionary[message_obj.msg_id]) {
        // Se il messaggio è già presente, aggiorna il suo contenuto
        const existingMessage = document.getElementById(`msg-${message_obj.msg_id}`);
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
    if (event.key === "Enter") { // Se si preme il tasto Invio
        // imposta a undefined l'id del messaggio corrente
        currentMessageID = undefined;
        input.value = ""; // ripulisci il campo di input
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Hide warning and info messages after user interaction
    const warningElement = document.querySelector('.warning');
    const infoElement = document.querySelector('.info');
    
    // Function to hide the initial messages
    function hideInitialMessages() {
        if (warningElement) warningElement.classList.add('hide-initial-message');
        if (infoElement) infoElement.classList.add('hide-initial-message');
        
        // Remove this event listener after first interaction
        document.removeEventListener('click', hideInitialMessages);
        document.removeEventListener('keydown', hideInitialMessages);
    }
    
    // Add event listeners to hide messages on first interaction
    document.addEventListener('click', hideInitialMessages);
    document.addEventListener('keydown', hideInitialMessages);
    
    // Hide messages after a timeout (optional, 30 seconds)
    setTimeout(hideInitialMessages, 30000);
});