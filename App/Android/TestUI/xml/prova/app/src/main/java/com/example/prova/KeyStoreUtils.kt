package com.example.prova

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.security.keystore.KeyProtection
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import java.io.IOException
import java.security.InvalidKeyException
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.NoSuchAlgorithmException
import java.security.PrivateKey
import java.security.PublicKey
import java.security.SecureRandom
import java.security.cert.CertificateException
import java.security.spec.MGF1ParameterSpec
import java.security.spec.RSAKeyGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import javax.crypto.spec.SecretKeySpec

/**
 * Utility class for KeyStore operations with both AES and RSA keys
 */
object KeyStoreUtils {
    private const val TAG = "KeyStoreUtils"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"

    /**
     * Generates an AES key and stores it in the KeyStore with the provided UUID as the alias
     *
     * @param uuid UUID string to use as the key alias
     * @param keySize Size of the key in bits (default: 256)
     * @return true if the key was successfully generated and stored, false otherwise
     */
    fun generateAndStoreAESKey(uuid: String, keySize: Int = 256): Boolean {
        try {
            val keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEYSTORE
            )

            val keySpec = KeyGenParameterSpec.Builder(
                uuid,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(keySize)
                .setRandomizedEncryptionRequired(true)
                .build()

            keyGenerator.init(keySpec)
            keyGenerator.generateKey()

            // Verify the key was created
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            val createdKey = keyStore.containsAlias(uuid)

            Log.d(TAG, "AES key generated and stored with alias: $uuid, success: $createdKey")
            return createdKey

        } catch (e: Exception) {
            Log.e(TAG, "Error generating AES key: ${e.message}", e)
            return false
        }
    }

    /**
     * Generates an RSA key pair and stores it in the KeyStore with the provided alias
     *
     * @param alias Alias to use for the key pair
     * @param keySize Size of the key in bits (default: 4096)
     * @return true if the key pair was successfully generated and stored, false otherwise
     */
    fun generateRSAKeyPair(alias: String, keySize: Int = 4096): Boolean {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
                load(null)
            }

            // Check if key already exists
            if (keyStore.containsAlias(alias)) {
                Log.d(TAG, "RSA key pair with alias $alias already exists")
                return false
            }

            val keyGenParams = KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_DECRYPT or KeyProperties.PURPOSE_ENCRYPT
            ).apply {
                setAlgorithmParameterSpec(RSAKeyGenParameterSpec(keySize, RSAKeyGenParameterSpec.F4))
                setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
                setUserAuthenticationRequired(false)
            }.build()

            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_RSA, ANDROID_KEYSTORE
            )
            keyPairGenerator.initialize(keyGenParams)
            keyPairGenerator.generateKeyPair()

            // Verify the key was created
            return keyStore.containsAlias(alias).also { success ->
                Log.d(TAG, "RSA key pair generated with alias: $alias, success: $success")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error generating RSA key pair: ${e.message}", e)
            return false
        }
    }

    /**
     * Gets the RSA key pair for the given alias
     *
     * @param alias The alias of the key pair
     * @return The KeyPair object or null if not found
     */
    fun getRSAKeyPair(alias: String): KeyPair? {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
                load(null)
            }

            if (!keyStore.containsAlias(alias)) {
                Log.d(TAG, "RSA key pair with alias $alias not found")
                return null
            }

            val privateKey = keyStore.getKey(alias, null) as? PrivateKey
            val publicKey = keyStore.getCertificate(alias)?.publicKey

            if (privateKey != null && publicKey != null) {
                return KeyPair(publicKey, privateKey)
            }

            Log.e(TAG, "Could not retrieve complete key pair for alias $alias")
            return null

        } catch (e: Exception) {
            Log.e(TAG, "Error retrieving RSA key pair: ${e.message}", e)
            return null
        }
    }

    /**
     * Gets the RSA public key encoded in Base64 with X.509 format for the given alias
     *
     * @param alias The alias of the key pair
     * @return PublicKey encoded in Base64 with X.509 format or null if error
     */
    fun getEncodedRSAPublicKey(alias: String): String? {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
                load(null)
            }

            if (!keyStore.containsAlias(alias)) {
                Log.d(TAG, "RSA key pair with alias $alias not found")
                return null
            }

            val publicKey = keyStore.getCertificate(alias)?.publicKey ?: return null

            // Codifica la chiave in formato X.509 (DER)
            val encoded = publicKey.encoded

            // Converti in Base64 per trasmissione
            val base64Key = Base64.encodeToString(encoded, Base64.NO_WRAP)

            return base64Key
        } catch (e: Exception) {
            Log.e(TAG, "Error encoding RSA public key: ${e.message}", e)
            return null
        }
    }


    /**
     * Decodes a Base64 encoded RSA public key into a PublicKey object
     *
     * @param base64Key The Base64 encoded RSA public key in X.509 format
     * @return The decoded PublicKey object or null if error
     */
    fun decodeRSAPublicKey(base64Key: String): PublicKey? {
        try {
            // Decodifica la stringa Base64 in array di byte
            val keyBytes = Base64.decode(base64Key, Base64.NO_WRAP)

            // Crea una specifica per la chiave pubblica in formato X.509
            val keySpec = X509EncodedKeySpec(keyBytes)

            // Ottiene un'istanza della factory RSA e genera la chiave pubblica
            val keyFactory = KeyFactory.getInstance("RSA")
            return keyFactory.generatePublic(keySpec)
        } catch (e: Exception) {
            Log.e(TAG, "Error decoding RSA public key: ${e.message}", e)
            return null
        }
    }

    /**
     * Generates a new AES symmetric key for secure communications
     *
     * @param keySize The size of the key in bits (default 256)
     * @return A new SecretKey object or null if error
     */
    fun generateSymmetricKey(keySize: Int = 256): SecretKey? {
        try {
            // Crea un generatore di chiavi AES
            val keyGenerator = KeyGenerator.getInstance("AES")

            // Inizializza il generatore con la dimensione della chiave desiderata
            keyGenerator.init(keySize, SecureRandom())

            // Genera e restituisce la chiave
            return keyGenerator.generateKey()
        } catch (e: Exception) {
            Log.e(TAG, "Error generating symmetric key: ${e.message}", e)
            return null
        }
    }

    /**
     * Encrypts a symmetric key using an RSA public key
     *
     * @param symmetricKey The symmetric key to encrypt
     * @param publicKey The RSA public key to use for encryption
     * @return The encrypted symmetric key as a Base64 encoded string or null if error
     */
    fun encryptSymmetricKeyWithRsa(symmetricKey: SecretKey, publicKey: PublicKey): String? {
        try {
            val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")

            val oaepParams = OAEPParameterSpec(
                "SHA-256", "MGF1",
                MGF1ParameterSpec.SHA1,  // Attenzione: SHA1 qui per compatibilità Android
                PSource.PSpecified.DEFAULT
            )

            cipher.init(Cipher.ENCRYPT_MODE, publicKey, oaepParams)

            val keyBytes = symmetricKey.encoded
            val encryptedKeyBytes = cipher.doFinal(keyBytes)
            return Base64.encodeToString(encryptedKeyBytes, Base64.NO_WRAP)

        } catch (e: Exception) {
            Log.e(TAG, "Error encrypting symmetric key: ${e.javaClass.simpleName} - ${e.message}", e)
            return null
        }
    }


    /**
     * Complete workflow to process a received public key encoded in Base64 with X.509 format, generate an AES symmetric key,
     * encrypt AES key with RSA public key for secure transmission
     *
     * @param base64PublicKey The Base64 encoded RSA public key received via QR code
     * @return A pair containing the generated symmetric key and its encrypted form, or null if error
     */
    fun processReceivedPublicKey(base64PublicKey: String): Pair<SecretKey, String>? {
        try {
            // Decodifica la chiave pubblica
            val publicKey = decodeRSAPublicKey(base64PublicKey) ?: return null

            // Genera una nuova chiave simmetrica
            val symmetricKey = generateSymmetricKey() ?: return null

            // Cifra la chiave simmetrica con la chiave pubblica RSA
            val encryptedKey = encryptSymmetricKeyWithRsa(symmetricKey, publicKey) ?: return null

            // Restituisce la coppia (chiave simmetrica, chiave simmetrica cifrata)
            return Pair(symmetricKey, encryptedKey)
        } catch (e: Exception) {
            Log.e(TAG, "Error in secure key exchange process: ${e.message}", e)
            return null
        }
    }


    fun decryptSymmetricKeyWithRsa(encryptedKeyBase64: String, rsaAlias: String): SecretKey? {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
                load(null)
            }

            val privateKey = keyStore.getKey(rsaAlias, null) as? PrivateKey
            if (privateKey == null) {
                Log.e(TAG, "decryptSymmetricKeyWithRsa: Private key not found for alias '$rsaAlias'. Assicurati che la chiave RSA sia stata generata correttamente e che l'alias sia corretto.")
                return null
            }

            val encryptedKeyBytes = try {
                Base64.decode(encryptedKeyBase64, Base64.NO_WRAP)
            } catch (e: IllegalArgumentException) {
                Log.e(TAG, "decryptSymmetricKeyWithRsa: Base64 decoding failed. La stringa fornita non è valida.", e)
                return null
            }

            val cipher = try {
                Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
            } catch (e: Exception) {
                Log.e(TAG, "decryptSymmetricKeyWithRsa: Impossibile ottenere l'istanza Cipher per RSA.", e)
                return null
            }

            val oaepParams = OAEPParameterSpec(
                "SHA-256", "MGF1",
                MGF1ParameterSpec.SHA1,
                PSource.PSpecified.DEFAULT
            )

            try {
                cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParams)
            } catch (e: InvalidKeyException) {
                Log.e(TAG, "decryptSymmetricKeyWithRsa: Chiave RSA non valida per la decrittazione.", e)
                return null
            }

            val decryptedKeyBytes = try {
                cipher.doFinal(encryptedKeyBytes)
            } catch (e: Exception) {
                Log.e(TAG, "decryptSymmetricKeyWithRsa: Errore durante la decrittazione della chiave AES. Assicurati che la chiave RSA sia corretta e che il testo cifrato sia valido.", e)
                return null
            }

            return SecretKeySpec(decryptedKeyBytes, 0, decryptedKeyBytes.size, "AES")
        } catch (e: Exception) {
            Log.e(TAG, "decryptSymmetricKeyWithRsa: Errore imprevisto durante il processo di decrittazione.", e)
            return null
        }
    }




    /**
     * Deletes a key with the given alias from the KeyStore
     *
     * @param alias The alias of the key to delete
     * @return true if the key was successfully deleted, false otherwise
     */
    fun deleteKey(alias: String): Boolean {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            if (keyStore.containsAlias(alias)) {
                keyStore.deleteEntry(alias)
                Log.d(TAG, "Key with alias $alias deleted successfully")
                return true
            }

            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting key with alias $alias", e)
            return false
        }
    }

    /**
     * Imports an AES key into the Android 12+ Keystore securely.
     * The key is protected using GCM encryption mode and no padding.
     * The key is stored in a secret entry within the Keystore, ensuring
     * it is only accessible for encryption and decryption operations.
     *
     * @param aesKey The AES key to import into the Keystore.
     * @param alias The alias to use for the key in the Keystore.
     * @return true if the key was successfully imported, false if an error occurred.
     */
    fun importAESKeyToKeystore(aesKey: SecretKey, alias: String): Boolean {
        return try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

            // Creiamo un'entry per la chiave AES
            val entry = KeyStore.SecretKeyEntry(aesKey)

            // Creiamo una protezione per la chiave con le opzioni appropriate
            val keyProtection = KeyProtection.Builder(
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM) // GCM è molto sicuro per AES
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE) // Nessun padding per AES
                .build()

            // Importa la chiave nel Keystore
            keyStore.setEntry(alias, entry, keyProtection)
            true
        } catch (e: Exception) {
            Log.e("KeyStore", "Errore nell'importazione della chiave AES: ${e.message}", e)
            false
        }
    }


    // TODO: note that there is a byte to specify the IV length

    /**
     * Encrypts a plaintext message using an AES key stored in Android Keystore.
     *
     * @param alias The alias of the AES key in the Keystore.
     * @param plaintext The message to encrypt.
     * @return Base64 encoded string containing IV + ciphertext + auth tag, or null on error.
     */
    fun encryptMessageWithAES(plaintext: String, alias: String): String? {
        try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            val secretKey = keyStore.getKey(alias, null) as? SecretKey
                ?: throw IllegalArgumentException("No AES key found with alias: $alias")

            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            val iv = cipher.iv

            val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

            val combined = iv + ciphertext
            return Base64.encodeToString(combined, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e("KeyStore", "Encryption failed: ${e.message}", e)
            return null
        }
    }


    /**
     * Decrypts a Base64-encoded message using an AES key stored in Android Keystore.
     *
     * @param alias The alias of the AES key in the Keystore.
     * @param encryptedData The Base64 encoded string containing IV + ciphertext + auth tag.
     * @return The decrypted plaintext string, or null on error.
     */
    fun decryptMessageWithAES(encryptedData: String, alias: String): String? {
        try {
            // Load the Keystore and retrieve the AES key
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            val secretKey = keyStore.getKey(alias, null) as? SecretKey
                ?: throw IllegalArgumentException("No AES key found with alias: $alias")

            // Decode from Base64
            val combined = Base64.decode(encryptedData, Base64.NO_WRAP)

            // Extract IV (first 12 bytes) and ciphertext+tag
            val iv = combined.copyOfRange(0, 12)
            val ciphertext = combined.copyOfRange(12, combined.size)

            // Initialize cipher for decryption
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val gcmSpec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)

            // Decrypt
            val plaintextBytes = cipher.doFinal(ciphertext)
            return String(plaintextBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e("KeyStore", "Decryption failed: ${e.message}", e)
            return null
        }
    }


    // LEGACY FUNCTIONS TODO: remove

    /**
     * Encrypts a string using an AES key from the KeyStore.
     *
     * @param message The string to encrypt
     * @param alias The alias of the AES key in the KeyStore
     * @return Base64 encoded string containing the IV and encrypted data, or null if encryption failed
     */
    fun encryptWithAES(message: String, alias: String): String? {
        try {
            // Get the KeyStore instance
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply {
                load(null)
            }

            // Check if the key exists
            if (!keyStore.containsAlias(alias)) {
                Log.e("Encryption", "AES key with alias $alias not found")
                return null
            }

            // Get the key from the KeyStore
            val secretKey = keyStore.getKey(alias, null) as? SecretKey
                ?: return null

            // Set up cipher for AES/GCM encryption
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            // Get the IV that was generated during cipher initialization
            val iv = cipher.iv

            // Encrypt the message
            val messageBytes = message.toByteArray(Charsets.UTF_8)
            val encryptedBytes = cipher.doFinal(messageBytes)

            // Combine IV and encrypted data
            // Format: [IV length (1 byte)][IV][encrypted data]
            val combined = ByteArray(1 + iv.size + encryptedBytes.size)
            combined[0] = iv.size.toByte()
            System.arraycopy(iv, 0, combined, 1, iv.size)
            System.arraycopy(encryptedBytes, 0, combined, 1 + iv.size, encryptedBytes.size)

            // Encode as Base64 string
            return Base64.encodeToString(combined, Base64.DEFAULT)

        } catch (e: Exception) {
            Log.e("Encryption", "Error encrypting with AES: ${e.message}", e)
            return null
        }
    }

    /**
     * Decrypts a string that was encrypted with encryptWithAES.
     *
     * @param encryptedMessage Base64 encoded string containing the IV and encrypted data
     * @param alias The alias of the AES key in the KeyStore
     * @return The decrypted string, or null if decryption failed
     */
    fun decryptWithAES(encryptedMessage: String, alias: String): String? {
        try {
            // Get the KeyStore instance
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply {
                load(null)
            }

            // Check if the key exists
            if (!keyStore.containsAlias(alias)) {
                Log.e("Decryption", "AES key with alias $alias not found")
                return null
            }

            // Get the key from the KeyStore
            val secretKey = keyStore.getKey(alias, null) as? SecretKey
                ?: return null

            // Decode the Base64 string
            val combined = Base64.decode(encryptedMessage, Base64.DEFAULT)

            // Extract IV length, IV, and encrypted data
            val ivLength = combined[0].toInt()
            val iv = ByteArray(ivLength)
            val encryptedBytes = ByteArray(combined.size - ivLength - 1)

            System.arraycopy(combined, 1, iv, 0, ivLength)
            System.arraycopy(combined, ivLength + 1, encryptedBytes, 0, encryptedBytes.size)

            // Set up cipher for AES/GCM decryption
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val ivSpec = javax.crypto.spec.GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, ivSpec)

            // Decrypt the data
            val decryptedBytes = cipher.doFinal(encryptedBytes)

            // Convert bytes to string
            return String(decryptedBytes, Charsets.UTF_8)

        } catch (e: Exception) {
            Log.e("Decryption", "Error decrypting with AES: ${e.message}", e)
            return null
        }
    }
}
