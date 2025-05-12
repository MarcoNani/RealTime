// Override console.log to disable logging
console.log = function() {};

const { time } = require("console");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve il frontend statico

const users = {};
const messages = []; // Array contenente i messaggi (associazione messaggio utente)

io.on("connection", (socket) => {
    let userId = users[socket.id]?.id || uuidv4();
    let username = users[socket.id]?.name || `Utente-${Math.floor(Math.random() * 1000)}`;
    users[socket.id] = { id: userId, name: username };
    console.log(`Utente connesso: ${username} (${userId})`);
    
    socket.emit("setUsername", username); // Invia solo al client connesso il suo username

    socket.on("setUsername", (newName) => { // Riceve il nuovo nome dall'utente
        users[socket.id].name = newName; // Aggiorna il nome dell'utente
        console.log(`Utente ${userId} ha cambiato nome in ${newName}`); // Logga il cambio di nome
    });
    
    socket.on("typing", (payload) => { // Riceve il messaggio di scrittura

        console.log (messages);
        
        if (payload.msg_id) { // controlla se il messaggio contiene un id messaggio
            // verifica che l'id del messaggio corrisponda ad un messaggio dell'utente corrente (guardando nella lista dei messaggi)
            console.log ( "Received message with local message id: " + payload.msg_id);
            if (messages.find((msg) => msg.msg_id === payload.msg_id && msg.id === socket.id)) { // Il messaggio è dell'utente corrente
                console.log ( "Message is from current user");
                // Aggiorna il messaggio con il nuovo payload
                const message_obj = { name: users[socket.id].name, payload: payload.text, time: new Date(), msg_id: payload.msg_id }; // realizzo l'oggetto contenente i dettagli sul messaggio
                io.emit("display", message_obj); // Invia a tutti i client l'oggetto messaggio
            }else {
                console.log ( "Message is not from current user");
                io.emit("display", "Hacker"); // Invia a tutti i client l'oggetto di errore
            }
        } else { // Se il messaggio non contiene un id messaggio
            // creo un nuovo messaggio con un nuovo id
            const message_obj = { name: users[socket.id].name, payload: payload.text, time: new Date(), msg_id: uuidv4() }; // realizzo l'oggetto contenente i dettagli sul messaggio
            io.emit("display", message_obj); // Invia a tutti i client l'oggetto messaggio
            messages.push({ id: socket.id, msg_id: message_obj.msg_id }); // Aggiungo l'oggetto messaggio alla lista dei messaggi
        }
    });
    
    socket.on("disconnect", () => { // Quando un utente si disconnette
        console.log(`Utente disconnesso: ${username} (${userId})`); // Logga la disconnessione
        delete users[socket.id]; // Rimuove l'utente dalla lista
    });
});

server.listen(3000, () => {
    console.info("Server in ascolto su http://localhost:3000");
});