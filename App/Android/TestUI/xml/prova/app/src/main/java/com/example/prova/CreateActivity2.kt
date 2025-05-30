package com.example.prova

import com.example.prova.KeyStoreUtils

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher

class CreateActivity2 : AppCompatActivity() {

    private lateinit var leds: List<View>
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var previewView: PreviewView
    private lateinit var debugTextView: TextView
    private var isQrProcessed = false

    companion object {
        private const val TAG = "QRScanner"
        private const val REQUEST_CAMERA_PERMISSION = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_2)

        // Initialize views
        previewView = findViewById(R.id.previewView)
        debugTextView = findViewById(R.id.debug)

        leds = listOf(
            findViewById(R.id.led1),
            findViewById(R.id.led2),
            findViewById(R.id.led3),
            findViewById(R.id.led4),
            findViewById(R.id.led5),
            findViewById(R.id.led6),
            findViewById(R.id.led7),
        )

        // Set all leds to off initially
        for (i in leds.indices) {
            setLedState(i, false)
        }

        // Turn on 1,2,3 leds
        setLedState(0, true)
        setLedState(1, true)
        setLedState(2, true)


        //processAuthenticationData("3ad97f5876be42de97659ef1ba0ea896|YuQju9tW+KeQuOHCwgYbnJ5wSUACRGeMQCX4F9Wpl5FVZRDzqS9RRUqwYtKpZTYvO9HQgGiVaViDhzIwbezQb0zG6FdlXGV1TK4wZjwomfyJXqrYHvH6Wx/ZUVjomJoI+KIFL8swYU3mzTZhUvsjQDsqnCN9j2OCzjEY0o54CxBPyQBUtfl70gjsfJ8orvCmrFAxBwzuDJfaW4NgCo2WGMTSfCy4/83+mncH6C2ISX/BKFh+oHhX/jPFlR1RPDQ6MNo7Iia48QlkzCBEEeMnK7A/UHoxQu66FNjfRfIO93V4NkmYykRZfEFddAkSOy0DqhGsgaMBK0aC/mUxVMDv1Oa8hyPwpmZozp6vUBAdFpzXBIJDe12ikBFWbJUzLALDzgEWQkUI8o0EbPBfEUZoW+h1tk4+Zfl0S3Hs/lfgnduyk7hPAnv8alg0wdCQFjqxJbQOaIPcHd2B+jQAzsxArzYcx2/2Dd3UU3gbqvqJXcT3oYIsTM6qOkjPPcZuXKJbvvX2PaGul0K95ri9KbLCPzrbs8lT/FsG2FzNViy+5o8RiyXeU+h2VYYS+7T+n8LluPa+aIKz9+lxy7m7Tnn/7+eHBaD042B8bJLZcvfMzW5b6p+2vncOmKLNrfO3vuO/GY9qBucoBfNN/4FKw1KAfJT4T1LImO+gYBnh+dzbStc=")


        // 4 - Scan QR code: Recive Encrypted AES & request ID

        // Put let 4 to yellow
        setLedState(3, true, Color.YELLOW)

        debug(debugTextView, "Starting QR scanner")

        // Initialize camera executor
        cameraExecutor = Executors.newSingleThreadExecutor()

        // Request camera permissions
        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, REQUEST_CAMERA_PERMISSION
            )
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            // Used to bind the lifecycle of cameras to the lifecycle owner
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            // Preview
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            // Image analysis for QR code scanning
            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor, QRCodeAnalyzer { qrCodes ->
                        if (qrCodes.isNotEmpty() && !isQrProcessed) {
                            qrCodes.forEach { barcode ->
                                barcode.rawValue?.let { value ->
                                    // QR code detected, update UI
                                    runOnUiThread {
                                        handleQRCode(value)
                                    }
                                }
                            }
                        }
                    })
                }

            // Select back camera as a default
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                // Unbind use cases before rebinding
                cameraProvider.unbindAll()

                // Bind use cases to camera
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalyzer
                )

                debug(debugTextView, "Camera started")

            } catch (exc: Exception) {
                Log.e(TAG, "Use case binding failed", exc)
                debug(debugTextView, "Error: ${exc.message}")
            }

        }, ContextCompat.getMainExecutor(this))
    }

    private fun handleQRCode(qrValue: String) {
        debug(debugTextView, "QR detected: ${qrValue.take(30)}...") // Only show beginning for long strings

        if (isValidAuthQr(qrValue)) {
            // We found the specific QR format we're looking for
            debug(debugTextView, "✅ Valid authentication QR detected")

            // Mark as processed to stop further scanning
            isQrProcessed = true

            Toast.makeText(this@CreateActivity2, "✅ Valid authentication QR detected", Toast.LENGTH_LONG).show()



            // Start next operations
            handleAuthenticationSuccess(qrValue)
        } else {
            // Not the QR we're looking for, continue scanning
            debug(debugTextView, "❌ Invalid QR format, continue scanning")

            Toast.makeText(this@CreateActivity2, "❌ Invalid QR format, continue scanning", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Verifica che il contenuto del QR code sia nel formato valido atteso.
     * Formato previsto: requestId|<Base64EncodedEncryptedKey>
     * Esempio: d6ed15fb67574c7d917028fd3fe65860|<EncryptedKeyBase64>
     *
     * @param qrValue Il valore del QR code da verificare
     * @return true se il formato è valido, false altrimenti
     */
    private fun isValidAuthQr(qrValue: String): Boolean {
        // Verifica che il QR contenga esattamente un separatore
        val parts = qrValue.split("|")
        if (parts.size != 2) {
            return false
        }

        val requestId = parts[0]
        val encryptedKey = parts[1]

        // Verifica che il requestId sia un UUID senza trattini (32 caratteri esadecimali)
        if (!requestId.matches(Regex("^[a-f0-9]{32}$"))) {
            return false
        }

        // Verifica che la chiave crittografata sia una stringa Base64 valida
        if (!encryptedKey.matches(Regex("^[A-Za-z0-9+/=]+$"))) {
            return false
        }

        // Verifica che la chiave abbia una lunghezza minima sensata (es. 200 caratteri)
        if (encryptedKey.length < 200) {
            return false
        }

        return true
    }

    private fun handleAuthenticationSuccess(qrValue: String) {
        // Stop the camera
        val cameraProvider = ProcessCameraProvider.getInstance(this).get()
        cameraProvider.unbindAll()

        debug(debugTextView, "Authentication successful")
        debug(debugTextView, "Processing authentication data...")

        // Here you would call your next function to handle the next steps
        // For example:
        processAuthenticationData(qrValue)
    }

    private fun processAuthenticationData(qrValue: String) {
        // [STAGE] 4  - Recive data from QR code

        // Split the QR value to extract the UUID and public key
        val parts = qrValue.split("|")
        val requestId = parts[0]
        val encryptedAESKeyBase64 = parts[1]


        // [STAGE] 5 - Decrypt AES key with the private key
        debug(debugTextView, "requestId: $requestId")
        setLedState(4, true, Color.YELLOW)

        // Ottengo il rsaKeyAlias e il roomId dalla Intent
        val intent = intent
        val rsaKeyAlias: String = intent.getStringExtra("rsaKeyAlias").toString()
        val roomId: String = intent.getStringExtra("roomId").toString()


        // Decifra la chiave AES usando la chiave RSA privata
        val decryptedSymmetricKey = KeyStoreUtils.decryptSymmetricKeyWithRsa(encryptedAESKeyBase64, rsaKeyAlias)

        if (decryptedSymmetricKey == null) {
            debug(debugTextView, "Errore nella decifrazione della chiave AES.")
            return
            // TODO: replace this with ABORT function call
        }

        debug(debugTextView, "AES key decrypted successfully!")
        setLedState(4, true)



        // [STAGE] 6 - Store the decrypted AES key in the Keystore
        debug(debugTextView, "Ask to store the decrypted AES key in the Keystore")
        setLedState(5, true, Color.YELLOW)

        KeyStoreUtils.importAESKeyToKeystore(decryptedSymmetricKey, roomId)

        setLedState(5, true)



        // [STAGE] 7 - Delete the key pair
        debug(debugTextView, "Ask to delete the key pair")
        setLedState(6, true, Color.YELLOW)

        val deletionStatus = KeyStoreUtils.deleteKey(rsaKeyAlias) // Delete the key pair
        if (deletionStatus) {
            debug(debugTextView, "RSA Key Pair Deleted")
            setLedState(6, true)
        } else {
            debug(debugTextView, "Error deleting RSA Key Pair")
            setLedState(6, true, Color.RED)
        }



        // [STAGE] 8 - Approve the Join request
        debug(debugTextView, "Ask to approve the Join request")
        setLedState(7, true, Color.YELLOW)

        



    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            if (allPermissionsGranted()) {
                startCamera()
            } else {
                debug(debugTextView, "Permissions not granted")
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    fun setLedState(index: Int, isOn: Boolean, onColor: Int = Color.GREEN) {
        if (index !in leds.indices) return

        val led = leds[index]

        val color = if (isOn) {
            onColor // acceso: colore brillante
        } else {
            // spento: versione più scura del colore
            darkenColor(onColor, 0.1f) // 10% di luminosità
        }

        led.background.setTint(color)
    }

    fun darkenColor(color: Int, factor: Float): Int {
        val r = ((Color.red(color) * factor).coerceIn(0f, 255f)).toInt()
        val g = ((Color.green(color) * factor).coerceIn(0f, 255f)).toInt()
        val b = ((Color.blue(color) * factor).coerceIn(0f, 255f)).toInt()
        return Color.rgb(r, g, b)
    }

    fun debug(debugTextView: TextView, newText: String) {
        // Ottieni il testo attuale del TextView
        val currentText = debugTextView.text.toString()

        // Aggiungi il nuovo testo con una nuova riga
        val updatedText = "$currentText\n$newText"

        // Imposta il testo aggiornato nel TextView
        debugTextView.text = updatedText

        // Scroll to the bottom to always show newest messages
        val scrollAmount = debugTextView.layout?.getLineTop(debugTextView.lineCount) ?: 0
        debugTextView.scrollTo(0, scrollAmount)
    }


}