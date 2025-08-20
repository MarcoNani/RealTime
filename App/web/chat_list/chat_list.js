async function fetchRooms() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        document.getElementById("roomsContainer").innerText = "Server or API key not found in localStorage.";
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
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        renderRooms(data.data.rooms);
        console.log(data.data);

        // Save rooms to IndexedDB
        const db = await DB.initDB();
        await DB.saveRoomsFromServer(db, data.data.rooms);

        // TODO: remove this
        // log saved rooms for debug purposes
        DB.getAllRooms(db).then(rooms => {
            console.log("Rooms saved in IndexedDB:", rooms);
        });


    } catch (error) {
        document.getElementById("roomsContainer").innerText = `Error: ${error.message}`;
        console.error(error);
    }
}

async function fetchJoinRequests(roomId) {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        alert("Server or API key not found in localStorage.");
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
            const errorMessage = errorData.message || "Unknown error";
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        return data.data.joinRequests.filter(request => request.approveStatus === "pending");
    } catch (error) {
        console.error(error);
        alert(`Error while fetching join requests: ${error.message}`);
        return [];
    }
}

async function voteOnJoinRequest(roomId, requestId, vote) {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        alert("Server or API key not found in localStorage.");
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
            const errorMessage = responseData.message || "Unknown error";
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        alert(responseData.message || (vote ? "Your vote to approve the new member has been successfully submitted!" : "Your vote to reject the new member has been successfully submitted!"));
        fetchRooms(); // Refresh the room list
    } catch (error) {
        console.error(error);
        alert(`Error while submitting the vote: ${error.message}`);
    }
}

function renderRooms(rooms) {
    const container = document.getElementById("roomsContainer");
    container.innerHTML = "";

    if (!rooms || rooms.length === 0) {
        container.innerText = "You are not a member of any room.";
        return;
    }

    const ul = document.createElement("ul");

    rooms.forEach(async room => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>Room ID:</strong> ${room.roomId}<br>
                        <strong>Members:</strong> ${room.members.map(m => m.username || m.publicId || 'Unknown').join(", ")}<br>
                        <a href="../chat/?roomId=${room.roomId}">Open Chat</a>`;

        const joinRequests = await fetchJoinRequests(room.roomId);

        if (joinRequests.length > 0) {
            const requestsDiv = document.createElement("div");
            requestsDiv.innerHTML = "<strong>Pending join requests:</strong>";
            const requestsList = document.createElement("ul");

            joinRequests.forEach(request => {
                const requestItem = document.createElement("li");
                requestItem.innerHTML = `${request.requestorUsername || request.requestorPublicId || "Unknown"} 
                                         <button style="color: green;" onclick="voteOnJoinRequest('${room.roomId}', '${request.requestId}', true)">Approve</button>
                                         <button style="color: red;" onclick="voteOnJoinRequest('${room.roomId}', '${request.requestId}', false)">Reject</button>`;
                requestsList.appendChild(requestItem);
            });

            requestsDiv.appendChild(requestsList);
            li.appendChild(requestsDiv);
        }

        ul.appendChild(li);
    });

    container.appendChild(ul);
}

// Start fetching on page load
fetchRooms();
/* 
// Refresh the room list every 5 seconds
setInterval(fetchRooms, 5000);
 */
async function createRoom() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        alert("Server or API key not found in localStorage.");
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
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const roomId = data.data.roomId;

        // Copy the roomId to the clipboard
        await navigator.clipboard.writeText(roomId);

        // Show alert with Room ID
        alert(`Room successfully created and Room ID copied to clipboard!\nRoom ID: ${roomId}`);


        // Refresh the room list
        fetchRooms();

    } catch (error) {
        console.error(error);
        alert(`Error while creating the room: ${error.message}`);
    }
}

// Link to the button
document.getElementById("createRoomButton").addEventListener("click", createRoom);

async function requestJoinRoom() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");
    const roomId = document.getElementById("roomIdInput").value;

    if (!serverUrl || !apiKey) {
        alert("Server or API key not found in localStorage.");
        return;
    }

    if (!roomId) {
        alert("Enter a valid room ID.");
        return;
    }

    const joinButton = document.getElementById("joinRoomButton");
    joinButton.disabled = true;
    joinButton.innerText = "Sending request...";

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
            const errorMessage = errorData.message || "Unknown error";
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        alert("Join request successfully sent!");
        joinButton.innerText = "Request sent!";
    } catch (error) {
        console.error(error);
        alert(`${error.message}`);
        joinButton.innerText = "Request to join a room";
    } finally {
        joinButton.disabled = false;
    }
}

// Link to the button
document.getElementById("joinRoomButton").addEventListener("click", requestJoinRoom);

// Link to the refresh button
document.getElementById("refreshRoomsButton").addEventListener("click", fetchRooms);
