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

    const input = document.getElementById("message");
    const chat = document.getElementById("chat");

    const apiKey = localStorage.getItem("apiKey");
    const serverUrl = localStorage.getItem("serverUrl");

    const socketConnection = new SocketConnection(serverUrl, apiKey);
    socketConnection.connect();

    // Add typing event listener
    input.addEventListener("input", () => {
        const payload = input.value;
        socketConnection.typing(roomId, payload);
    });
}

class SocketConnection {
    constructor(serverUrl, apiKey) {
        this.serverUrl = serverUrl;
        this.apiKey = apiKey;
        this.socket = null;
        this.authStatus = false;
        this.currentMessageID = undefined;
    }

    connect() {
        this.socket = io(this.serverUrl);

        this.socket.on("connect", () => {
            console.log("Connected to server with id:", this.socket.id);
            console.log("Sending API Key:", this.apiKey);
            this.socket.emit("auth", { apiKey: this.apiKey });
        });

        this.socket.on("authSuccess", (message) => {
            console.info("Authentication successful, received:", message);
            // TODO: check if username and publicId match with those stored in the localStorage, if not warn the user about it and request if he wants to update them
            this.authStatus = true;
        });

        this.socket.on("authFailed", (error) => {
            console.error("Authentication failed:", error);
            this.authStatus = false;
        });

        this.socket.on("disconnect", () => {
            console.log("Disconnected from server");
        });

/*         
        this.socket.on("messageId", (payload) => {
            // When a new message ID is received
            console.info("Received message ID:", payload); // Show the message ID
            this.currentMessageID = payload.messageId; // Set the current message ID
        });
 */

        this.socket.on("ack", (payload) => {
            // When we receive an ack for writing a message
            console.info("Received ack message:", payload); // Show the message ID

            // TODO: manage the ack process so that we can confirm the message was received
        });

        this.socket.on("typing", (payload) => {
            // When we receive a typing version of a message
            console.warn("Ricevuto un typing:", payload); // Mostra l'id del messaggio

            // TODO: check in what room is this message, if it is in the current one show to the user
            // TODO: store the message in the local message db
            // TODO: decrypt the message payload for proper viewing
        });

        this.socket.on("finish", (payload) => {
            // When we receive a final version of a message
            console.warn("Ricevuta una versione finale:", payload); // Mostra l'id del messaggio

            // TODO: check in what room is this message, if it is in the current one show to the user
            // TODO: store the message in the local message db
            // TODO: decrypt the message payload for proper viewing
        });
    }

    requestMessageId(room) {
        return new Promise((resolve, reject) => {
            if (this.authStatus) {
                const messageIdPayload = {
                    sendId: uuidv4(),
                    roomId: room
                };

                console.log("Requesting message ID with payload:", messageIdPayload);
                this.socket.emit("messageId", messageIdPayload);

                // Listen for the "messageId" event
                this.socket.once("messageId", (payload) => {
                    console.info("Received message ID:", payload);
                    this.currentMessageID = payload.messageId;
                    resolve(payload.messageId);
                });

                // Timeout
                setTimeout(() => {
                    reject(new Error("Timeout while waiting for message ID"));
                }, 60000); // 60 seconds timeout
            } else {
                console.error("Authentication not completed, cannot request message ID.");
                reject(new Error("Authentication not completed"));
            }
        });
    }

    async typing(room, payload) {
        try {
            // Request a new message ID if not already available
            if (!this.currentMessageID) {
                console.log("No currentMessageID, requesting one...");
                this.currentMessageID = await this.requestMessageId(room);
            }

            // Create the message object
            const message_obj = {
                sendId: uuidv4(),
                messageId: this.currentMessageID,
                roomId: room,
                payload: payload,
            };

            // Send the message to the server
            console.log("Sending typing message with local message id:", message_obj);
            this.socket.emit("typing", message_obj);
        } catch (error) {
            console.error("Error while sending typing message:", error);
        }
    }
}

// Start the chat
initChat();