async function fetchRooms() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        document.getElementById("roomsContainer").innerText = "Server o API key non trovati in localStorage.";
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms`, {
            method: "GET",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Errore API: ${response.status}`);
        }

        const data = await response.json();
        renderRooms(data.data.rooms);
    } catch (error) {
        document.getElementById("roomsContainer").innerText = `Errore: ${error.message}`;
        console.error(error);
    }
}

function renderRooms(rooms) {
    const container = document.getElementById("roomsContainer");
    container.innerHTML = "";

    if (!rooms || rooms.length === 0) {
        container.innerText = "Non sei membro di nessuna stanza.";
        return;
    }

    const ul = document.createElement("ul");

    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Room ID:</strong> ${room.roomId}<br>
                        <strong>Members:</strong> ${room.members.map(m => m.username || m.publicId || 'Unknown').join(", ")}<br>
                        <a href="../chat/?roomId=${room.roomId}">Apri Chat</a>`;
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

// Avvia il fetch al caricamento della pagina
fetchRooms();

async function createRoom() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        alert("Server o API key non trovati in localStorage.");
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms`, {
            method: "POST",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Errore API: ${response.status}`);
        }

        const data = await response.json();
        const roomId = data.data.roomId;

        // Mostra alert con Room ID
        alert(`Stanza creata con successo!\nRoom ID: ${roomId}`);

        // Copia il roomId negli appunti
        await navigator.clipboard.writeText(roomId);

        // Aggiorna la lista delle stanze
        fetchRooms();

    } catch (error) {
        console.error(error);
        alert(`Errore durante la creazione della stanza: ${error.message}`);
    }
}

// Collegamento al pulsante
document.getElementById("createRoomButton").addEventListener("click", createRoom);
