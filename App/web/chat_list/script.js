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

async function fetchJoinRequests(roomId) {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        alert("Server o API key non trovati in localStorage.");
        return [];
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms/${roomId}/join-requests`, {
            method: "GET",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.message || "Errore sconosciuto";
            throw new Error(`Errore API: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        return data.data.joinRequests.filter(request => request.approveStatus === "pending");
    } catch (error) {
        console.error(error);
        alert(`Errore durante il recupero delle richieste di join: ${error.message}`);
        return [];
    }
}

async function voteOnJoinRequest(roomId, requestId, vote) {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        alert("Server o API key non trovati in localStorage.");
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms/${roomId}/join-requests/${requestId}/votes`, {
            method: "PATCH",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ vote })
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.message || "Errore sconosciuto";
            throw new Error(`Errore API: ${response.status} - ${errorMessage}`);
        }

        alert(responseData.message || (vote ? "Il tuo voto per approvare il nuovo membro è stato inviato con successo!" : "Il tuo voto per rifiutare il nuovo membro è stato inviato con successo!"));
        fetchRooms(); // Aggiorna la lista delle stanze
    } catch (error) {
        console.error(error);
        alert(`Errore durante l'invio del voto: ${error.message}`);
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

    rooms.forEach(async room => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Room ID:</strong> ${room.roomId}<br>
                        <strong>Members:</strong> ${room.members.map(m => m.username || m.publicId || 'Unknown').join(", ")}<br>
                        <a href="../chat/?roomId=${room.roomId}">Apri Chat</a>`;

        const joinRequests = await fetchJoinRequests(room.roomId);

        if (joinRequests.length > 0) {
            const requestsDiv = document.createElement("div");
            requestsDiv.innerHTML = "<strong>Richieste di join in pending:</strong>";
            const requestsList = document.createElement("ul");

            joinRequests.forEach(request => {
                const requestItem = document.createElement("li");
                requestItem.innerHTML = `${request.requestorUsername || request.requestorPublicId || "Unknown"} 
                                         <button style="color: green;" onclick="voteOnJoinRequest('${room.roomId}', '${request.requestId}', true)">Approva</button>
                                         <button style="color: red;" onclick="voteOnJoinRequest('${room.roomId}', '${request.requestId}', false)">Rifiuta</button>`;
                requestsList.appendChild(requestItem);
            });

            requestsDiv.appendChild(requestsList);
            li.appendChild(requestsDiv);
        }

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

        // Copia il roomId negli appunti
        await navigator.clipboard.writeText(roomId);

        // Mostra alert con Room ID
        alert(`Stanza creata con successo e Room ID copiato negli appunti!\nRoom ID: ${roomId}`);


        // Aggiorna la lista delle stanze
        fetchRooms();

    } catch (error) {
        console.error(error);
        alert(`Errore durante la creazione della stanza: ${error.message}`);
    }
}

// Collegamento al pulsante
document.getElementById("createRoomButton").addEventListener("click", createRoom);

async function requestJoinRoom() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");
    const roomId = document.getElementById("roomIdInput").value;

    if (!serverUrl || !apiKey) {
        alert("Server o API key non trovati in localStorage.");
        return;
    }

    if (!roomId) {
        alert("Inserisci un ID stanza valido.");
        return;
    }

    const joinButton = document.getElementById("joinRoomButton");
    joinButton.disabled = true;
    joinButton.innerText = "Invio richiesta...";

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms/${roomId}/join-requests`, {
            method: "POST",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.message || "Errore sconosciuto";
            throw new Error(`Errore API: ${response.status} - ${errorMessage}`);
        }

        alert("Richiesta di join inviata con successo!");
        joinButton.innerText = "Richiesta inviata!";
    } catch (error) {
        console.error(error);
        alert(`${error.message}`);
        joinButton.innerText = "Chiedi di entrare in una stanza";
    } finally {
        joinButton.disabled = false;
    }
}

// Collegamento al pulsante
document.getElementById("joinRoomButton").addEventListener("click", requestJoinRoom);
