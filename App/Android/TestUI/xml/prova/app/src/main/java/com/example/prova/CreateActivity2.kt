package com.example.prova

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

    private fun isValidAuthQr(qrValue: String): Boolean {
        // Check if QR content matches the expected format
        // Looking for: UUID|OpenSSLRSAPublicKey{...}
        return qrValue.contains("|OpenSSLRSAPublicKey") &&
                qrValue.split("|").size == 2 &&
                qrValue.split("|")[0].matches(Regex("[a-f0-9]{32}"))
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
        // This is a placeholder for your next function
        // Implement your specific logic here

        // Split the QR value to extract the UUID and public key
        val parts = qrValue.split("|")
        val uuid = parts[0]
        val publicKeyString = parts[1]

        debug(debugTextView, "UUID: $uuid")
        debug(debugTextView, "Starting next phase of authentication...")


        // Turn on the 4 led
        setLedState(3, true)

        // You can implement your next steps here
        // For example, you might want to:
        // 1. Store the public key
        // 2. Navigate to another activity
        // 3. Start communication with a server
        // 4. etc.
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