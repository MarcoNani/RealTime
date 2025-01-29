const socket = io();
const input = document.getElementById("message");
const chat = document.getElementById("chat");

input.addEventListener("input", () => {
    socket.emit("typing", input.value);
});

socket.on("display", (message) => {
    chat.textContent = message;
});