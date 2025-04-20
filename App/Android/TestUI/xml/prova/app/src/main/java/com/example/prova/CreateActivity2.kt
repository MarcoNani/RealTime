package com.example.prova

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
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

        debug(debugTextView, "Starting QR scanner")

        // Set all leds to off initially
        for (i in leds.indices) {
            setLedState(i, false)
        }

        // Turn on first 3 leds
        for (i in 0 until 3) {
            setLedState(i, true)
        }

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
                        if (qrCodes.isNotEmpty()) {
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
        // Illuminate different LEDs based on the QR code content
        // This is just an example pattern - modify according to your needs
        debug(debugTextView, "QR detected: $qrValue")

        // Reset all LEDs
        for (i in leds.indices) {
            setLedState(i, false)
        }

        // Simple example: light up LEDs based on the string length
        val length = qrValue.length.coerceAtMost(leds.size)
        for (i in 0 until length) {
            setLedState(i, true)
        }

        // You can implement more sophisticated patterns based on QR content
        // For example, different colors for different types of QR codes
        if (qrValue.startsWith("http")) {
            // URL - green
            for (i in 0 until length) {
                setLedState(i, true, Color.GREEN)
            }
        } else if (qrValue.matches(Regex("\\d+"))) {
            // Numeric - blue
            for (i in 0 until length) {
                setLedState(i, true, Color.BLUE)
            }
        } else {
            // Other - yellow
            for (i in 0 until length) {
                setLedState(i, true, Color.YELLOW)
            }
        }
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

        // Optional: scroll to the bottom to always show newest messages
        val scrollAmount = debugTextView.layout?.getLineTop(debugTextView.lineCount) ?: 0
        debugTextView.scrollTo(0, scrollAmount)
    }
}

// QR Code Analyzer class
private class QRCodeAnalyzer(private val onQRCodesDetected: (qrCodes: List<Barcode>) -> Unit) :
    ImageAnalysis.Analyzer {

    private val scanner = BarcodeScanning.getClient()

    @androidx.camera.core.ExperimentalGetImage
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(
                mediaImage,
                imageProxy.imageInfo.rotationDegrees
            )

            // Process image for QR codes
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        onQRCodesDetected(barcodes)
                    }
                }
                .addOnCompleteListener {
                    // Important: close the image proxy to release resources
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
}