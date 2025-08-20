// Retrieve the roomId from the query string
function getRoomIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId");
}

// Initialize the chat window
async function initChat() {
    const roomId = getRoomIdFromURL();
    const roomInfoDiv = document.getElementById("roomInfo");

    if (!roomId) {
        roomInfoDiv.textContent = "Nessuna stanza selezionata.";
        return;
    }

    roomInfoDiv.textContent = `Sei nella stanza: ${roomId}`;

    const input = document.getElementById("message"); // Input field for messages
    const chat = document.getElementById("chat"); // Chat display area

    const apiKey = localStorage.getItem("apiKey");
    const serverUrl = localStorage.getItem("serverUrl");

    const socketConnection = new SocketConnection(serverUrl, roomId, apiKey);
    await socketConnection.connect();

    // Load messages for the current room
    try {
        const db = socketConnection.db; // Use the initialized database instance
        const messages = await DB.getMessagesForRoom(db, roomId, {
            order: "asc", // Load messages in ascending order
            // limit: 50 // Load the last 50 messages
        });

        // Render each message in the chat
        messages.forEach(renderMessage);
    } catch (error) {
        console.error("Failed to load messages for room:", error);
    }

    // Typing event listener
    input.addEventListener("input", () => {
        const payload = input.value;
        socketConnection.typing(roomId, payload);
    });

    // Enter key event listener
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline behavior
            const payload = input.value.trim();
            if (payload) {
                socketConnection.finishTyping(roomId, payload);
                input.value = ""; // Clear the input field after sending
            }
        }
    });
}

class SocketConnection {
    constructor(serverUrl, currentRoomId, apiKey) {
        this.serverUrl = serverUrl;
        this.currentRoomId = currentRoomId;
        this.apiKey = apiKey;
        this.socket = null;
        this.authStatus = false;
        this.currentMessageID = undefined;
        this.username = undefined; // Placeholder for username
        this.publicId = undefined; // Placeholder for public ID
        this.db = null; // Placeholder for the database instance
        this.userDictionary = {}; // Dictionary to store publicId -> username mappings
    }

    async connect() {
        this.socket = io(this.serverUrl);

        // TODO: i have to study race condition problems

        try {
            // Await the database initialization
            this.db = await DB.initDB();
            console.log("Database initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize the database:", error);
            return; // Exit if the database initialization fails
        }

        this.socket.on("connect", () => {
            console.log("Connected to server with id:", this.socket.id);
            console.log("Sending API Key:", this.apiKey);
            this.socket.emit("auth", { apiKey: this.apiKey });
        });

        this.socket.on("authSuccess", (message) => {
            console.info("Authentication successful, received:", message);
            // TODO: check if username and publicId match with those stored in the db, if not warn the user about it and request if he wants to update them
            this.authStatus = true;

            this.username = message.username;
            this.publicId = message.publicId;
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
            console.warn("Ricevuto un typing:", payload);

            // Create message object
            const message = {
                payload: payload.payload,
                timestamp: payload.timestamp,
                username: this.userDictionary[payload.publicId] || payload.publicId, // Replace publicId with username
                publicId: payload.publicId,
                messageId: payload.messageId,
                typing: true // Indicate that this is a typing message
            };

            // DONE: check if the message is for the current room or for another room: if current room render, if not only store it
            if (payload.roomId === this.currentRoomId) {
                // Render message
                console.log("Rendering message:", message);
                renderMessage(message);
            } else {
                console.log("Message is not for current room:", message);
            }

            // Store message in indexDB
            // TODO: i can implement a QUEUE system but now i don't want to do it
            message.roomId = payload.roomId;
            message.type = "text";
            console.log("Storing message in indexDB:", message);
            DB.saveMessage(this.db, message); // Pass the initialized db instance

        });

        this.socket.on("finish", (payload) => {
            // When we receive a final version of a message
            console.warn("Ricevuta una versione finale:", payload);

            // Create message object
            const message = {
                payload: payload.payload,
                timestamp: payload.timestamp,
                username: this.userDictionary[payload.publicId] || payload.publicId, // Replace publicId with username
                publicId: payload.publicId,
                messageId: payload.messageId,
                typing: false // Indicate that the user is no longer typing this msg
            };

            // DONE: check if the message is for the current room or for another room: if current room render, if not only store it
            if (payload.roomId === this.currentRoomId) {
                // Render message
                console.log("Rendering message:", message);
                renderMessage(message);
            } else {
                console.log("Message is not for current room:", message);
            }

            // Store message in indexDB
            // TODO: i can implement a QUEUE system but now i don't want to do it
            message.roomId = payload.roomId;
            message.type = "text";
            console.log("Storing message in indexDB:", message);
            DB.saveMessage(this.db, message); // Pass the initialized db instance
        });

        try {
            // Load the user dictionary for the current room from the database
            const users = await DB.getUsersForRoom(this.db, this.currentRoomId);
            this.userDictionary = users.reduce((dict, user) => {
                dict[user.publicId] = user.username;
                return dict;
            }, {});
            console.log("Loaded user dictionary for room:", this.userDictionary);
        } catch (error) {
            console.error("Failed to load user dictionary for room:", error);
        }
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

            // Create message object
            const message = {
                payload: payload,
                timestamp: new Date().toISOString(), // Store timestamp in ISO 8601 format
                username: this.username,
                publicId: this.publicId,
                messageId: this.currentMessageID,
                typing: true // Indicate that this is a typing message
            };

            // Render message
            renderMessage(message);

            // Store message in indexDB
            // TODO: i can implement a QUEUE system but now i don't want to do it
            message.roomId = room;
            message.type = "text";
            console.log("Storing message in indexDB:", message);
            DB.saveMessage(this.db, message); // Pass the initialized db instance

        } catch (error) {
            console.error("Error while sending typing message:", error);
        }
    }

    finishTyping(room, payload) {
        // Finish typing the message and send the final payload to the server
        const message_obj = {
            sendId: uuidv4(),
            messageId: this.currentMessageID,
            roomId: room,
            payload: payload,
        };

        console.log("Sending finish message with local message id:", message_obj);
        this.socket.emit("finish", message_obj);

        // Create message object
        const message = {
            payload: payload,
            timestamp: new Date().toISOString(), // Store timestamp in ISO 8601 format
            username: this.username,
            publicId: this.publicId,
            messageId: this.currentMessageID,
            typing: false // Indicate that the user is no longer typing this msg
        };

        // Render message
        renderMessage(message);

        // Store message in indexDB
        // TODO: i can implement a QUEUE system but now i don't want to do it
        message.roomId = room;
        message.type = "text";
        console.log("Storing message in indexDB:", message);
        DB.saveMessage(this.db, message); // Pass the initialized db instance

        this.currentMessageID = undefined; // Reset the current message ID after sending
    }

    displayMessage(payload) {
        // Check if the message belongs to the current room
        if (payload.roomId === getRoomIdFromURL()) {
            const chat = document.getElementById("chat");
            const existingMessage = document.getElementById(`message-${payload.messageId}`);

            if (existingMessage) {
                // Update the existing message
                existingMessage.innerHTML = generateTextMessage({
                    name: payload.publicId, // TODO: replace with the actual username obtained by local db of room members
                    time: new Date().toLocaleTimeString(),
                    payload: payload.payload
                });
            } else {
                // Create a new message element
                const messageElement = document.createElement("div");
                messageElement.id = `message-${payload.messageId}`;
                messageElement.innerHTML = generateTextMessage({
                    name: payload.publicId,
                    time: new Date().toLocaleTimeString(),
                    payload: payload.payload
                });
                chat.appendChild(messageElement);
            }
            scrollToBottom();
        }
    }
}

// Start the chat
initChat();