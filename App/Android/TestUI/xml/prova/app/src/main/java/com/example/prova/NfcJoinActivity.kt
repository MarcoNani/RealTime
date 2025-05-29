package com.example.prova

import com.example.prova.KeyStoreUtils

import android.content.Context
import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.graphics.Bitmap
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
import java.security.KeyFactory
import java.security.spec.X509EncodedKeySpec
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import android.util.Base64
import android.widget.ImageView
import androidx.lifecycle.lifecycleScope
import com.example.prova.api.ApiService
import com.example.prova.api.RetrofitProvider
import com.example.prova.model.ErrorResponse
import com.google.gson.Gson
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.launch
import retrofit2.Response
import java.math.BigInteger
import java.security.KeyStore
import java.security.spec.RSAPublicKeySpec
import java.util.regex.Pattern

class NfcJoinActivity : AppCompatActivity() {

    private lateinit var leds: List<View>
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var previewView: PreviewView
    private lateinit var debugTextView: TextView
    private lateinit var qrImageView: ImageView
    private var isQrProcessed = false

    companion object {
        private const val TAG = "QRScanner"
        private const val REQUEST_CAMERA_PERMISSION = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nfc_join)

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

        qrImageView = findViewById(R.id.qrImageView)







        // [STAGE] 1 - Scan QR code: Recive public RSA key & RoomId

        // Put led 1 to yellow
        setLedState(0, true, Color.YELLOW)

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

            Toast.makeText(this@NfcJoinActivity, "✅ Valid authentication QR detected", Toast.LENGTH_LONG).show()



            // Start next operations
            handleAuthenticationSuccess(qrValue)
        } else {
            // Not the QR we're looking for, continue scanning
            debug(debugTextView, "❌ Invalid QR format, continue scanning")

            Toast.makeText(this@NfcJoinActivity, "❌ Invalid QR format, continue scanning", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Verifica che il contenuto del QR code sia nel formato valido atteso.
     * Formato previsto: UUID|<Base64EncodedRSAPublicKey>
     * Esempio: 25bed286ab7a490e884bf5e8de526922|MIICIjANBgkqhkiG9w0BAQEF...
     *
     * @param qrValue Il valore del QR code da verificare
     * @return true se il formato è valido, false altrimenti
     */
    private fun isValidAuthQr(qrValue: String): Boolean {
        // Verifica che il QR contenga un separatore e sia diviso in due parti
        val parts = qrValue.split("|")
        if (parts.size != 2) {
            return false
        }

        // Verifica che il roomId sia un UUID valido (32 caratteri esadecimali)
        val roomId = parts[0]
        if (!roomId.matches(Regex("[a-f0-9]{32}"))) {
            return false
        }

        // Verifica che la seconda parte sia una chiave pubblica RSA codificata in Base64
        val publicKey = parts[1]

        // Le chiavi pubbliche RSA in formato X.509 codificate in Base64 generalmente
        // iniziano con "MI" (MII, MIC, ecc.)
        if (!publicKey.startsWith("MI")) {
            return false
        }

        // Verifica che la stringa Base64 contenga solo caratteri validi
        if (!publicKey.matches(Regex("^[A-Za-z0-9+/=]+$"))) {
            return false
        }

        // Ulteriore controllo opzionale: verifica che la lunghezza della chiave sia ragionevole
        // Una chiave RSA (codificata in Base64) è generalmente lunga almeno 200 caratteri
        if (publicKey.length < 200) {
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
        // Split the QR value to extract the roomId and public key
        val parts = qrValue.split("|")
        val roomId = parts[0]
        val base64PublicKey = parts[1]

        debug(debugTextView, "roomId: $roomId")
        debug(debugTextView, "publicKeyString: $base64PublicKey")
        debug(debugTextView, "Starting next phase of authentication...")

        // Turn on the 1 led
        setLedState(0, true)


        // [STAGE] 2 - Generate a AES Key and store it in the Keystore, encrypt AES key with the public key recived
        setLedState(1, true, Color.YELLOW)

        val keyPair = KeyStoreUtils.processReceivedPublicKey(base64PublicKey)
        if (keyPair == null) {
            Toast.makeText(this@NfcJoinActivity, "Impossibile processare la chiave pubblica", Toast.LENGTH_LONG).show()
            return
        }

        val (symmetricKey, encryptedKeyBase64) = keyPair

        // Store the symmetric key in the keystore
        KeyStoreUtils.importAESKeyToKeystore(symmetricKey, roomId)

        setLedState(1, true)

        // TODO: remove TEST
        val encryptedMessage = KeyStoreUtils.encryptWithAES("Hello World", roomId)
        Toast.makeText(this, "Encrypted message: $encryptedMessage", Toast.LENGTH_LONG).show()
        val decryptedMessage = KeyStoreUtils.decryptWithAES(encryptedMessage.toString(), roomId)
        Toast.makeText(this, "Decrypted message: $decryptedMessage", Toast.LENGTH_LONG).show()


        // [STAGE] 3 - Make a join request to the server API
        setLedState(2, true, Color.YELLOW)

        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        val apiKey  = sharedPref.getString("API_KEY", null).toString()
        debug(debugTextView, "API Key: $apiKey")
        val server = sharedPref.getString("SERVER_URL", null).toString()
        debug(debugTextView, "Server: $server")

        // Call the API to join the room
        lifecycleScope.launch {
            val requestId = sendJoinRequest(apiKey, server, roomId)

            if (requestId != null) {
                Log.d("JoinRequest", "Richiesta inviata con ID: $requestId")

                setLedState(2, true)

                // [STAGE] 4 - Generate QR code with encrypted AES key and requestId
                setLedState(3, true, Color.YELLOW)

                val sendQRCodeContent = "$requestId|$encryptedKeyBase64"
                val bmpQRCode = generateQRCode(sendQRCodeContent)
                qrImageView.setImageBitmap(bmpQRCode)

                setLedState(3, true)



                // [STAGE] 5 - Check if i am in the room (GET /api/v1/rooms/[roomId]) untill 200

                // Open chat activity


            } else {
                Log.e("JoinRequest", "Errore durante la richiesta di join")
            }
        }








    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult( requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
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


    fun showPersistentMessage(context: Context, message: String, title: String = "Error") {
        AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("OK :(") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    fun abort(roomId: String, message: String = "Something went wrong, no more information given", context: Context = this) {
        val debugTextView: TextView = findViewById(R.id.debug)

        debug(debugTextView, "Ask to delete the AES key")
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) } // Load the key store
        keyStore.deleteEntry(roomId) // Delete the AES key
        debug(debugTextView, "AES Key Deleted")

        // set all led to red
        setLedState(0, true, Color.RED)
        setLedState(1, true, Color.RED)
        setLedState(2, true, Color.RED)
        setLedState(3, true, Color.RED)
        setLedState(4, true, Color.RED)
        setLedState(5, true, Color.RED)
        setLedState(6, true, Color.RED)

        showPersistentMessage(context, message)
    }

    private fun parseError(response: Response<*>): String {
        return try {
            val errorBody = response.errorBody()?.string()
            if (errorBody != null) {
                val errorResponse = Gson().fromJson(errorBody, ErrorResponse::class.java)
                errorResponse.message
            } else {
                "Unknown error"
            }
        } catch (e: Exception) {
            "Unknown error"
        }
    }

    private suspend fun sendJoinRequest(apiKey: String, server: String, roomId: String): String? {
        return try {
            val retrofit = RetrofitProvider.provideRetrofit(server, apiKey)
            val apiService = retrofit.create(ApiService::class.java)

            val response = apiService.sendJoinRequest(roomId)

            if (response.isSuccessful) {
                response.body()?.data?.requestId
            } else {
                val errorMessage = parseError(response)
                abort(roomId, "Error during join request: $errorMessage (HTTP ${response.code()})")
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            abort(roomId, "Error during join request: ${e.message}")
            null
        }
    }


    fun generateQRCode(qrCodeContent: String): Bitmap {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(qrCodeContent, BarcodeFormat.QR_CODE, 512, 512)
        val bmp = Bitmap.createBitmap(512, 512, Bitmap.Config.RGB_565)

        for (x in 0 until 512) {
            for (y in 0 until 512) {
                bmp.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }

        return bmp
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