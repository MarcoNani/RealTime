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
    return await window.crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
}

async function getAESKeyForDisplay(roomId) {
// retrieve the aes key from local storage and display it in base64
    const aesKeyB64 = localStorage.getItem(`aesKey_${roomId}`);
    if (!aesKeyB64) {
        throw new Error("AES Key not found");
    }
    return aesKeyB64;
}