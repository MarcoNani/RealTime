async function requestJoinRoom(roomId) {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        throw new Error("Server or API key not found in localStorage.");
    }

    if (!roomId) {
        throw new Error("Room ID is required.");
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms/${roomId}/join-requests`, {
            method: "POST",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || "Unknown error";
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getRoomDetails(roomId) {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        throw new Error("Server or API key not found in localStorage.");
    }

    if (!roomId) {
        throw new Error("Room ID is required.");
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms/${roomId}`, {
            method: "GET",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function createRoom() {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        throw new Error("Server or API key not found in localStorage.");
    }

    try {
        const response = await fetch(`${serverUrl}/api/v1/rooms`, {
            method: "POST",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || "Unknown error";
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error(error);
        throw error;
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
        throw new Error("Server or API key not found in localStorage.");
    }

    if (!roomId) {
        throw new Error("Room ID is required.");
    }

    if (!requestId) {
        throw new Error("Request ID is required.");
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

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || "Unknown error";
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}
