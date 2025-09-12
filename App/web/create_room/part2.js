async function decrypt_private_key(wrappedB64) {
      try{
        pem = localRsa.privPem;
        console.log(pem, wrappedB64);
        if(!pem || !wrappedB64) return alert('Insert PEM and wrapped key');
        const privKey = await importPrivateKeyFromPEM(pem);
        const wrappedBuf = base64ToBuf(wrappedB64);

        // Unwrap into an AES-GCM key and make it extractable so we can export raw and display
        const aesKey = await window.crypto.subtle.unwrapKey(
          'raw',
          wrappedBuf,
          privKey,
          { name:'RSA-OAEP' },
          { name:'AES-GCM', length:256 },
          true, // extractable true so we can save the raw key
          ['decrypt']
        );
        
        return aesKey;
      }catch(e){
        console.error(e); alert('Errore: '+(e.message||e));
      }
    }