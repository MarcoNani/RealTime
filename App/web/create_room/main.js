function getMostRecentJoinRequest(joinRequests) {
    if (!Array.isArray(joinRequests) || joinRequests.length === 0) {
        return null;
    }

    return joinRequests.reduce((latest, current) => {
        const latestDate = new Date(latest.requestedAt);
        const currentDate = new Date(current.requestedAt);
        return currentDate > latestDate ? current : latest;
    });
}

async function main() {
    // api call to create a room
    const createRoomResponse = await createRoom();

    // generate and display the QR code
    const roomId = createRoomResponse.data.data.roomId;
    //roomId = "fdadfb7ae80440fe96c92d888674fe7f" // TODO: remove, debug only
    new QRCode(document.getElementById("qrcode"), roomId);
    console.log("Room created with ID:", roomId);

    // TODO: when implementing chipration use the correct join request id
    let approveJoinRequestResponse;
    do {
        // Fetch the latest join requests
        const joinRequestResponse = await fetchJoinRequests(roomId);
        console.log("Join requests for room:", joinRequestResponse);

        // Get the most recent join request
        const mostRecentJoinRequest = getMostRecentJoinRequest(joinRequestResponse);
        console.log("Most recent join request:", mostRecentJoinRequest);

        if (!mostRecentJoinRequest) {
            console.log("No join requests yet, waiting...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        // Check if the join request is within the last hour
        const requestedAt = new Date(mostRecentJoinRequest.requestedAt);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (requestedAt < oneHourAgo) {
            console.log("Most recent join request is older than 1 hour, retrying...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        // Approve the join request
        const requestId = mostRecentJoinRequest.requestId;
        const approveResponse = await voteOnJoinRequest(roomId, requestId, true);
        console.log("Approve join request response:", approveResponse.status);

        // Retry if approval failed
        if (approveResponse.status !== 200) {
            console.log("Approval failed, retrying...");
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            break; // Exit loop if approval succeeded
        }

    } while (true);

    console.log("Join request approved, adding the room to the IDB...");
    
    
    // Add the new chatroom the the IDB
    const roomDetails = await getRoomDetails(roomId);

    // il db si aspetta una rray contenente i dettagli di varie stanze ma noi abbiamo solo una stanza
    const roomsArray = [roomDetails.data.data];

    // Save rooms to IndexedDB
    const db = await DB.initDB();
    await DB.saveRoomsFromServer(db, roomsArray);


    // when approved open the chatroom
    console.log("Join request approved, opening chatroom...");
    window.location.href = `../chat/?roomId=${roomId}`;
}

main();