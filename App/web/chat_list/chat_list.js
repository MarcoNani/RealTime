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
            },
            cache: "no-store" // never use the browser cache
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        // TODO: load rooms from IndexedDB and compare to server data to understand discrepancies

        // TODO: remove a user if he is no longer in a room but keep the room in the db and display it in the list

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
    } finally {
        // Refresh the room list automatically
        setTimeout(fetchRooms, 5000);
    }
}

// TODO: use the function from api.js instead
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

    if (!rooms || rooms.length === 0) {
        container.innerText = "You are not a member of any room.";
        return;
    }

    // Use or create the <ul>
    let ul = container.querySelector("ul");
    if (!ul) {
        ul = document.createElement("ul");
        container.innerHTML = "";
        container.appendChild(ul);
    }

    const currentRoomIds = new Set(rooms.map(r => r.roomId));

    // Remove rooms that no longer exist
    Array.from(ul.children).forEach(li => {
        const roomId = li.dataset.roomId;
        if (!currentRoomIds.has(roomId)) {
            ul.removeChild(li);
        }
    });

    // Update / Add rooms
    rooms.forEach(async room => {
        let li = ul.querySelector(`[data-room-id="${room.roomId}"]`);

        // If it doesn't exist, create it
        if (!li) {
            li = document.createElement("li");
            li.dataset.roomId = room.roomId;
            ul.appendChild(li);
        }

        // Generate a shorter hash ID for the roomId
        const hashLength = 4; // You can modify this length
        const shortRoomId = await generateShortHash(room.roomId, hashLength);

        // Update the room contents
        const membersText = room.members
            .map(m => m.username || m.publicId || "Unknown")
            .join(", ");

        const link = document.createElement("a");
        link.href = `../chat/?roomId=${encodeURIComponent(room.roomId)}`;
        link.className = "chat-link";

        const roomIdText = document.createElement("strong");
        roomIdText.textContent = `Room hash: ${shortRoomId}`;
        link.appendChild(roomIdText);
        link.appendChild(document.createElement("br"));

        const membersLabel = document.createElement("strong");
        membersLabel.textContent = "Members: ";
        link.appendChild(membersLabel);

        const membersSpan = document.createElement("span");
        membersSpan.textContent = membersText;
        link.appendChild(membersSpan);
        link.appendChild(document.createElement("br"));

        const requestsDiv = document.createElement("div");
        requestsDiv.className = "requests";
        link.appendChild(requestsDiv);

        li.innerHTML = ""; // Clear previous content
        li.appendChild(link);

        // Update join requests
        const joinRequests = await fetchJoinRequests(room.roomId);

        if (joinRequests.length > 0) {
            requestsDiv.innerHTML = "<strong>Pending join requests:</strong>";
            const requestsList = document.createElement("ul");

            joinRequests.forEach(request => {
                const requestItem = document.createElement("li");
                const requestorText = document.createTextNode(
                    request.requestorUsername || request.requestorPublicId || "Unknown"
                );

                const approveButton = document.createElement("button");
                approveButton.style.color = "green";
                approveButton.textContent = "Approve";
                approveButton.onclick = () => voteOnJoinRequest(room.roomId, request.requestId, true);

                const rejectButton = document.createElement("button");
                rejectButton.style.color = "red";
                rejectButton.textContent = "Reject";
                rejectButton.onclick = () => voteOnJoinRequest(room.roomId, request.requestId, false);

                requestItem.appendChild(requestorText);
                requestItem.appendChild(document.createTextNode(" "));
                requestItem.appendChild(approveButton);
                requestItem.appendChild(document.createTextNode(" "));
                requestItem.appendChild(rejectButton);

                requestsList.appendChild(requestItem);
            });

            requestsDiv.appendChild(requestsList);
        } else {
            requestsDiv.innerHTML = ""; // No requests
        }
    });

async function generateShortHash(input, length) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    const uppercaseHashHex = hashHex.toUpperCase();
    return uppercaseHashHex.slice(0, length);
}
}

/* 
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

        // Show alert with Room ID
        alert(`Room successfully created with Room ID: ${roomId}`);


        // Refresh the room list
        fetchRooms();

    } catch (error) {
        console.error(error);
        alert(`Error while creating the room: ${error.message}`);
    }
}
 */

/* 
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
 */

function start() {
    roomsContainer = document.getElementById("roomsContainer");
    roomsContainer.innerHTML = "Loading, this may take up to 1 minute, please wait...";
    fetchRooms();
}



// Start fetching on page load
start();