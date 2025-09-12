async function gen_aes_and_wrap(pubPem) {
    try {
        const pem = pubPem.trim();
        if (!pem) return alert('Insert public PEM key');
        const pubKey = await importPublicKeyFromPEM(pem);

        // Generate AES key
        const aesKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true, // extractable to allow wrapping and saving
            ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
        );

        // Wrap the AES key with RSA-OAEP
        const wrapped = await window.crypto.subtle.wrapKey('raw', aesKey, pubKey, { name: 'RSA-OAEP' });
        const wrappedB64 = bufToBase64(wrapped);

        // Return the wrapped key and the AES key
        return { wrappedB64, aesKey };

    } catch (e) {
        console.error(e); alert('Errore: ' + e.message);
    }
}