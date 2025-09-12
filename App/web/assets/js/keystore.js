async function saveAESKey(roomId, aesKey) {
// save the aes key to the local storage
    const raw = await window.crypto.subtle.exportKey('raw', aesKey);
    const aesKeyB64 = bufToBase64(raw);
    localStorage.setItem(`aesKey_${roomId}`, aesKeyB64);
    console.log("AES Key saved to local storage.");
}

async function getAESKey(roomId) {
// retrieve the aes key from local storage
    const aesKeyB64 = localStorage.getItem(`aesKey_${roomId}`);
    if (!aesKeyB64) {
        throw new Error("AES Key not found");
    }
    const raw = base64ToBuf(aesKeyB64);
    return await window.crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function getAESKeyForDisplay(roomId) {
// retrieve the aes key from local storage and display it in base64
    const aesKeyB64 = localStorage.getItem(`aesKey_${roomId}`);
    if (!aesKeyB64) {
        throw new Error("AES Key not found");
    }
    return aesKeyB64;
}

async function encryptPayload(payload, roomId) {
    // Retrieve the AES key for the room
    const aesKey = await getAESKey(roomId);

    // Convert the payload to a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // Generate a random initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        data
    );

    // Combine IV and encrypted data into a single Uint8Array
    const encryptedData = new Uint8Array(iv.length + encrypted.byteLength);
    encryptedData.set(iv);
    encryptedData.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage or transmission
    return bufToBase64(encryptedData);
}

async function decryptPayload(encryptedPayload, roomId) {
    // Retrieve the AES key for the room
    const aesKey = await getAESKey(roomId);

    // Convert the base64 payload back to a Uint8Array
    const encryptedData = base64ToBuf(encryptedPayload);

    // Extract the IV and the encrypted content
    const iv = encryptedData.slice(0, 12);
    const encryptedContent = encryptedData.slice(12);

    // Decrypt the data
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        encryptedContent
    );

    // Convert the decrypted data back to a string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}