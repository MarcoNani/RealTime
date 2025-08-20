window.DB = (function() {

  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ChatDB", 1);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("Rooms")) {
          const roomsStore = db.createObjectStore("Rooms", { keyPath: "roomId" });
          roomsStore.createIndex("roomId_idx", "roomId", { unique: true });
          roomsStore.createIndex("latestMessageTimestamp_idx", "latestMessageTimestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains("Users")) {
          const usersStore = db.createObjectStore("Users", { keyPath: "publicId" });
          usersStore.createIndex("publicId_idx", "publicId", { unique: true });
        }

        if (!db.objectStoreNames.contains("Messages")) {
          const messagesStore = db.createObjectStore("Messages", { keyPath: "messageId" });
          messagesStore.createIndex("roomId_idx", "roomId", { unique: false });
          messagesStore.createIndex("timestamp_idx", "timestamp", { unique: false });
        }
      };

      request.onsuccess = function (event) {
        const db = event.target.result;
        console.log("Database initialized:", db.name);
        resolve(db);
      };

      request.onerror = function (event) {
        console.error("Database error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  function getTransaction(db, stores, mode = "readwrite") {
    return db.transaction(stores, mode);
  }

  function saveUser(usersStore, member) {
    const user = { publicId: member.publicId, username: member.username };
    usersStore.put(user);
  }

  function haveMembersChanged(existingMembers, newMembers) {
    if (existingMembers.size !== newMembers.size) return true;
    for (let m of newMembers) {
      if (!existingMembers.has(m)) return true;
    }
    return false;
  }

  async function saveOrUpdateRoom(roomsStore, roomId, members) {
    const request = roomsStore.get(roomId);

    return new Promise((resolve, reject) => {
      request.onsuccess = function (event) {
        const existingRoom = event.target.result;

        if (!existingRoom) {
          // Room doesn't exist, create a new one
          const newRoom = {
            roomId,
            members: members.map(m => m.publicId),
            latestMessageTimestamp: Date.now()
          };
          roomsStore.put(newRoom);
        } else {
          // Room exists, update it if members have changed
          const existingMembers = new Set(existingRoom.members);
          const newMembers = new Set(members.map(m => m.publicId));

          if (haveMembersChanged(existingMembers, newMembers)) {
            existingRoom.members = Array.from(newMembers);
            roomsStore.put(existingRoom);
          }
        }

        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function saveRoomsFromServer(db, roomsFromServer) {
    // Save rooms and users from server to IndexedDB (update if already exist)
    const tx = getTransaction(db, ["Rooms", "Users"]);
    const roomsStore = tx.objectStore("Rooms");
    const usersStore = tx.objectStore("Users");

    for (const serverRoom of roomsFromServer) {
      const { roomId, members } = serverRoom;

      for (const member of members) saveUser(usersStore, member);

      await saveOrUpdateRoom(roomsStore, roomId, members);
    }

    return tx.complete;
  }

  function getAllRooms(db) {
    return new Promise((resolve, reject) => {
      const tx = getTransaction(db, ["Rooms"], "readonly");
      const store = tx.objectStore("Rooms");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function saveMessage(db, message) {
    // If we have stored a final version of a message with the same ID, the partial version should not be stored
    return new Promise((resolve, reject) => {
      const tx = getTransaction(db, ["Messages"]);
      const messagesStore = tx.objectStore("Messages");

      const request = messagesStore.get(message.messageId);

      request.onsuccess = () => {
        const existingMessage = request.result;

        // Check if the existing message is final and should not be overwritten
        if (existingMessage && !existingMessage.typing) {
          resolve(); // Do not store the partial message
        } else {
          const newMessage = {
            messageId: message.messageId,
            roomId: message.roomId,
            payload: message.payload,
            timestamp: message.timestamp,
            publicId: message.publicId,
            type: message.type,
            typing: message.typing
          };

          const putRequest = messagesStore.put(newMessage);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  return {
    initDB,
    saveRoomsFromServer,
    getAllRooms,
    saveMessage
  };
})();
