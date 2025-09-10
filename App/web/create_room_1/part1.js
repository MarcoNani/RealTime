// State (keeps the generated keys in memory for convenience)
let localRsa = { publicKey: null, privateKey: null, pubPem: '', privPem: '' };
let lastWrappedB64 = '';

async function start_part1() {
    aggiungiLog("Starting room creation and RSA key generation...");
    try {
        // Start both operations in parallel
        const createRoomPromise = createRoom();
        const genKeyPairPromise = gen_rsa_keypair();

        // Wait for both to complete
        const [createRoomResponse] = await Promise.all([createRoomPromise, genKeyPairPromise]);
        aggiungiLog("Room created and RSA keypair generated.");
        aggiungiLog("Room ID: " + createRoomResponse.data.data.roomId);
        aggiungiLog("Public Key PEM: " + localRsa.pubPem);

        // Generate and display the QR code
        const roomId = createRoomResponse.data.data.roomId;
        const publicKeyPEM = localRsa.pubPem;
        new QRCode(document.getElementById("qrcode"), roomId + '|' + publicKeyPEM);
        console.log("Room created with ID:", roomId);
        console.log("QR Code content:", roomId + '|' + publicKeyPEM);

        // Show the next button
        document.getElementById('next').style.display = 'inline-block';
    } catch (error) {
        alert("An error occurred: " + error.message);
        console.error(error);
    }
}

async function gen_rsa_keypair() {
    const keys = await window.crypto.subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
    localRsa.publicKey = keys.publicKey;
    localRsa.privateKey = keys.privateKey;
    localRsa.pubPem = await exportPublicKeyToPEM(keys.publicKey);
    localRsa.privPem = await exportPrivateKeyToPEM(keys.privateKey);
    document.getElementById('pubPem').textContent = localRsa.pubPem;
    document.getElementById('privPem').textContent = localRsa.privPem;
}