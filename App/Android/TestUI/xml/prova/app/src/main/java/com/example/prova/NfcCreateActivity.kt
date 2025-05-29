package com.example.prova

import com.example.prova.KeyStoreUtils

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Bitmap

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.example.prova.api.ApiService
import com.example.prova.api.RetrofitProvider
import com.example.prova.model.CreateRoomResponse
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.spec.RSAKeyGenParameterSpec
import retrofit2.Response

import java.util.UUID

class NfcCreateActivity : AppCompatActivity() {

    private lateinit var leds: List<View>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nfc_create)

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

        val debugTextView: TextView = findViewById(R.id.debug)

        val qrImageView: ImageView = findViewById(R.id.qrImageView)

        val nextButton: View = findViewById(R.id.next)

        debug(debugTextView, "Start")


        // [STAGE] 1 - Ask to the Keystore to generate RSA key pair
        debug(debugTextView, "Ask to the Keystore to generate RSA key pair")
        setLedState(0, true, Color.YELLOW)

        val rsaKeyAlias = UUID.randomUUID().toString() // Generate an alias for this session
        debug(debugTextView, "RSA Key Alias: $rsaKeyAlias")

        KeyStoreUtils.generateRSAKeyPair(rsaKeyAlias) // Generate the key pair
        val publicKey = KeyStoreUtils.getEncodedRSAPublicKey(rsaKeyAlias) // Get the public key encoded in base64 with X.509 format


        debug(debugTextView, "RSA Key Pair Generated")
        debug(debugTextView, "Public Key: $publicKey")

        setLedState(0, true)


        // [STAGE] 2 - API call to create a room
        debug(debugTextView, "API call to create a room")
        setLedState(1, true, Color.YELLOW)

        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        val apiKey  = sharedPref.getString("API_KEY", null)
        debug(debugTextView, "API Key: $apiKey")
        val server = sharedPref.getString("SERVER_URL", null)
        debug(debugTextView, "Server: $server")

        if (apiKey != null && server != null) {
            // Ottieni il roomId prima di proseguire
            lifecycleScope.launch {
                val roomId = createRoom(apiKey, server, rsaKeyAlias)

                debug(debugTextView, "roomId: $roomId")

                if (roomId == null) {
                    // Something went wrong during the room creation
                    debug(debugTextView, "Something went wrong during the room creation")
                    return@launch
                }

                // Dopo aver ottenuto il roomId, continua
                debug(debugTextView, "Room created with ID: $roomId")
                setLedState(1, true)

                // Puoi continuare a usare roomId per altre operazioni
                Toast.makeText(this@NfcCreateActivity, "Room created with ID: $roomId", Toast.LENGTH_LONG).show()


                // [STAGE] 3 - QR code generation
                debug(debugTextView, "QR code generation")
                setLedState(2, true, Color.YELLOW)

                val qrCodeContent = "$roomId|$publicKey"
                val bmpQRCode = generateQRCode(qrCodeContent)
                qrImageView.setImageBitmap(bmpQRCode)

                debug(debugTextView, "QR code generated")
                setLedState(2, true)

                nextButton.setOnClickListener {
                    // Launch the scanner activity
                    try {
                        val intent = Intent(this@NfcCreateActivity, CreateActivity2::class.java)
                        intent.putExtra("rsaKeyAlias", rsaKeyAlias)
                        intent.putExtra("roomId", roomId)
                        startActivity(intent)
                        finish()
                    } catch (e: Exception) {
                        debug(debugTextView, "Error launching activity: ${e.message}")
                        Toast.makeText(this@NfcCreateActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }

                nextButton.visibility = View.VISIBLE












            }
        } else {
            Toast.makeText(this, "API Key or server missing", Toast.LENGTH_SHORT).show()
            debug(debugTextView, "API Key or server missing")
            abort(rsaKeyAlias)
        }











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
    }


    fun generateRSAKeyPair(alias: String) {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply {
            load(null)
        }

        // Evita di rigenerare se la chiave già esiste
        if (keyStore.containsAlias(alias)) return

        val keyGenParams = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        ).apply {
            setAlgorithmParameterSpec(RSAKeyGenParameterSpec(4096, RSAKeyGenParameterSpec.F4))
            setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
            setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
            setUserAuthenticationRequired(false) // True richiede l'autenticazione dell'utente
        }.build()

        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore"
        )
        keyPairGenerator.initialize(keyGenParams)
        keyPairGenerator.generateKeyPair()
    }

    private suspend fun createRoom(apiKey: String, server: String, rsaKeyAlias: String): String? {
        return try {
            val retrofit = RetrofitProvider.provideRetrofit(server, apiKey)
            val apiService = retrofit.create(ApiService::class.java)

            val response: Response<CreateRoomResponse> = apiService.createRoom()

            if (response.isSuccessful) {
                response.body()?.data?.roomId
            } else {
                // Response code is not 200
                abort(rsaKeyAlias, "Error creating room: ${response.code()}")
                null // Returns null in case of error
            }
        } catch (e: Exception) {
            e.printStackTrace()
            abort(rsaKeyAlias, "Error creating room: ${e.message}")
            null // Returns null in case of error
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

    fun abort(rsaKeyAlias: String, message: String = "Something went wrong, no more information given", context: Context = this) {
        val debugTextView: TextView = findViewById(R.id.debug)

        debug(debugTextView, "Ask to delete the key pair")
        setLedState(6, true, Color.YELLOW)

        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) } // Load the key store

        keyStore.deleteEntry(rsaKeyAlias) // Delete the key pair
        debug(debugTextView, "RSA Key Pair Deleted")
        setLedState(6, true)

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

}
