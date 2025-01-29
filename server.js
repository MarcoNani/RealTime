// Install dependencies: npm install express socket.io

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve il frontend statico

io.on("connection", (socket) => {
    console.log("Un utente si è connesso");
    
    socket.on("typing", (data) => {
        socket.broadcast.emit("display", data); // Invia a tutti tranne chi scrive
    });
    
    socket.on("disconnect", () => {
        console.log("Un utente si è disconnesso");
    });
});

server.listen(3000, () => {
    console.log("Server in ascolto su http://localhost:3000");
});
