// Utility base64 helpers
function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
function base64ToBuf(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

// PEM export/import
async function exportPublicKeyToPEM(publicKey) {
    const spki = await window.crypto.subtle.exportKey('spki', publicKey);
    const b64 = bufToBase64(spki);
    return '-----BEGIN PUBLIC KEY-----\n' + chunkString(b64, 64) + '\n-----END PUBLIC KEY-----';
}
async function exportPrivateKeyToPEM(privateKey) {
    const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    const b64 = bufToBase64(pkcs8);
    return '-----BEGIN PRIVATE KEY-----\n' + chunkString(b64, 64) + '\n-----END PRIVATE KEY-----';
}
function chunkString(str, size) {
    const re = new RegExp('.{1,' + size + '}', 'g');
    return (str.match(re) || []).join('\n');
}
function pemToArrayBuffer(pem) {
    const b64 = pem.replace(/-----(BEGIN|END) (PUBLIC|PRIVATE) KEY-----/g, '').replace(/\s+/g, '');
    return base64ToBuf(b64);
}

async function importPublicKeyFromPEM(pem) {
    const buf = pemToArrayBuffer(pem);
    return window.crypto.subtle.importKey('spki', buf, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt', 'wrapKey']);
}
async function importPrivateKeyFromPEM(pem) {
    const buf = pemToArrayBuffer(pem);
    return window.crypto.subtle.importKey('pkcs8', buf, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt', 'unwrapKey']);
}