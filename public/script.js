const socket = io();
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const usernameInput = document.getElementById("username");
const setUsernameBtn = document.getElementById("setUsername");

let username = "";
let currentMessageID = undefined;

let messageDictionary = {};



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
    socket.emit("typing", message_obj); // Invia il messaggio di scrittura al server
    console.log ( "Sending message with local message id: " + message_obj.msg_id);
});

socket.on("display", (message_obj) => { // Riceve il messaggio da visualizzare
    console.log(message_obj);
    chat.innerHTML = `<p><strong>${message_obj.name}:</strong> ${message_obj.payload}</p>`; // Visualizza il messaggio
    messageDictionary[message_obj.msg_id] = message_obj; // Aggiunge il messaggio al dizionario
});