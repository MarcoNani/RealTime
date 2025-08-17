// Recupera il roomId dalla query string
function getRoomIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId");
}

// Inizializza la finestra chat
function initChat() {
    const roomId = getRoomIdFromURL();
    const roomInfoDiv = document.getElementById("roomInfo");

    if (!roomId) {
        roomInfoDiv.textContent = "Nessuna stanza selezionata.";
        return;
    }

    roomInfoDiv.textContent = `Sei nella stanza: ${roomId}`;

    // Qui puoi aggiungere fetch o WebSocket per recuperare i messaggi della stanza
    // fetchMessages(roomId) oppure apri WebSocket
}

// Event listener per invio messaggio (boilerplate)
document.getElementById("sendButton").addEventListener("click", () => {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (!message) return;

    // TODO: inviare il messaggio tramite API o WebSocket
    console.log(`Invio messaggio nella stanza: ${getRoomIdFromURL()}`, message);

    input.value = "";
});

// Avvia la chat
initChat();
