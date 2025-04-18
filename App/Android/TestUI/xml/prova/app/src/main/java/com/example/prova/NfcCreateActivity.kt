package com.example.prova

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.example.prova.api.ApiService
import com.example.prova.api.RetrofitProvider
import com.example.prova.model.CreateRoomResponse
import kotlinx.coroutines.launch
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.spec.RSAKeyGenParameterSpec

import retrofit2.Call
import retrofit2.Callback
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

        val debugTextView: TextView = findViewById(R.id.debug)

        debug(debugTextView, "Start")


        // 1 - Ask to the Keystore to generate RSA key pair
        debug(debugTextView, "Ask to the Keystore to generate RSA key pair")
        setLedState(0, true, Color.YELLOW)

        val rsaKeyAlias = UUID.randomUUID().toString() // Generate an alias for this session
        debug(debugTextView, "RSA Key Alias: $rsaKeyAlias")

        generateRSAKeyPair(rsaKeyAlias) // Generate the key pair
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) } // Load the key store
        val publicKey = keyStore.getCertificate(rsaKeyAlias).publicKey // Get the public key

        debug(debugTextView, "RSA Key Pair Generated")
        debug(debugTextView, "Public Key: $publicKey")

        setLedState(0, true)


        // 2 - API call to create a room
        debug(debugTextView, "API call to create a room")
        setLedState(1, true, Color.YELLOW)

        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        val apiKey  = sharedPref.getString("API_KEY", null)
        debug(debugTextView, "API Key: $apiKey")
        val server = sharedPref.getString("SERVER_URL", null)
        debug(debugTextView, "Server: $server")

        if (apiKey != null && server != null) {
            createRoom(apiKey, server)

            debug(debugTextView, "Room created")
            setLedState(1, true)
        } else {
            // gestisci il caso in cui siano null (es. mostra errore)
            Toast.makeText(this, "API Key or server missing", Toast.LENGTH_SHORT).show()
        }





        // 7 - Ask to delete the key pair
        debug(debugTextView, "Ask to delete the key pair")
        setLedState(6, true, Color.YELLOW)

        keyStore.deleteEntry(rsaKeyAlias) // Delete the key pair
        debug(debugTextView, "RSA Key Pair Deleted")
        setLedState(6, true)



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


    private fun createRoom(apiKey: String, server: String) {
        lifecycleScope.launch {
            try {
                val retrofit = RetrofitProvider.provideRetrofit(server, apiKey)
                val apiService = retrofit.create(ApiService::class.java)

                val response = apiService.createRoom()

                if (response.isSuccessful) {
                    val roomId = response.body()?.data?.roomId
                    Toast.makeText(this@NfcCreateActivity, "Room creata: $roomId", Toast.LENGTH_LONG).show()

                    debug(findViewById(R.id.debug), "Room creata: $roomId")
                    // Puoi anche navigare a un'altra activity qui
                } else {
                    Toast.makeText(this@NfcCreateActivity, "Errore: ${response.code()}", Toast.LENGTH_SHORT).show()

                    debug(findViewById(R.id.debug), "Errore: ${response.code()}")
                }
            } catch (e: Exception) {
                Toast.makeText(this@NfcCreateActivity, "Errore: ${e.message}", Toast.LENGTH_SHORT).show()

                debug(findViewById(R.id.debug), "Errore: ${e.message}")
            }
        }
    }



}
