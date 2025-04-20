package com.example.prova

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.io.IOException
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.NoSuchAlgorithmException
import java.security.cert.CertificateException
import javax.crypto.KeyGenerator

/**
 * Utility class for KeyStore operations
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

        } catch (e: NoSuchAlgorithmException) {
            Log.e(TAG, "Error generating AES key: algorithm not available", e)
        } catch (e: KeyStoreException) {
            Log.e(TAG, "Error accessing KeyStore", e)
        } catch (e: CertificateException) {
            Log.e(TAG, "Error with certificates", e)
        } catch (e: IOException) {
            Log.e(TAG, "I/O error accessing KeyStore", e)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error generating AES key", e)
        }

        return false
    }

    /**
     * Checks if a key with the given alias exists in the KeyStore
     *
     * @param alias The alias to check
     * @return true if the key exists, false otherwise
     */
    fun keyExists(alias: String): Boolean {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            return keyStore.containsAlias(alias)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if key exists", e)
            return false
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
}