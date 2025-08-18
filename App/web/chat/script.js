// Retrieve the roomId from the query string
function getRoomIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId");
}

// Initialize the chat window
function initChat() {
    const roomId = getRoomIdFromURL();
    const roomInfoDiv = document.getElementById("roomInfo");

    if (!roomId) {
        roomInfoDiv.textContent = "Nessuna stanza selezionata.";
        return;
    }

    roomInfoDiv.textContent = `Sei nella stanza: ${roomId}`;

    // Initialize the socket connection
    const input = document.getElementById("message");
    const chat = document.getElementById("chat");

    const apiKey = localStorage.getItem("apiKey");
    const publicId = localStorage.getItem("publicId");
    const serverUrl = localStorage.getItem("serverUrl");
    const username = localStorage.getItem("username");

    let authStatus = false;

    const socket = io(serverUrl);

    console.log(roomId);



    // Events logs
    socket.on("connect", () => {
        // When connected to the server
        console.log("Connected to server with id:", socket.id); // Show connection message
        console.log("Sending API Key:", apiKey);
        socket.emit("auth", { apiKey: apiKey }); // Send API key to server
    });

    socket.on("authSuccess", (message) => {
        // When authentication is successful
        console.info("Authentication successful, recieved:", message); // Show success message

        // TODO: check if username and publicId match with those stored in the localStorage, if not warn the user about it and request if he wants to update them
        authStatus = true; // Set authentication status to true
    });

    socket.on("authFailed", (error) => {
        // When authentication fails
        console.error("Authentication failed:", error); // Show error message
        authStatus = false; // Set authentication status to false
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from server");
    });
}



// Avvia la chat
initChat();
