async function gen_aes_and_wrap(pubPem) {
    try {
        const pem = pubPem.trim();
        if (!pem) return alert('Insert public PEM key');
        const pubKey = await importPublicKeyFromPEM(pem);

        // Generate AES key
        const aesKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true, // TODO: extractable true solo per mostrare il raw (debug/demo)
            ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
        );

        // Wrap the AES key with RSA-OAEP
        const wrapped = await window.crypto.subtle.wrapKey('raw', aesKey, pubKey, { name: 'RSA-OAEP' });
        const wrappedB64 = bufToBase64(wrapped);
        lastWrappedB64 = wrappedB64; // TODO: remove
        document.getElementById('wrapped').textContent = wrappedB64;

        // Also show AES raw (base64) for debug TODO: remove
        const raw = await window.crypto.subtle.exportKey('raw', aesKey);
        document.getElementById('aesRaw').textContent = bufToBase64(raw);
        console.log("RAW AES Key (Base64):", bufToBase64(raw)); // TODO: remove

        // Return the wrapped key and the AES key
        return { wrappedB64, aesKey };

    } catch (e) {
        console.error(e); alert('Errore: ' + e.message);
    }
}