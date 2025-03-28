package com.example.prova

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST

class WelcomeActivity : AppCompatActivity() {

    private lateinit var usernameEditText: EditText
    private lateinit var submitButton: Button
    private lateinit var serverEditText: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_welcome)

        // Controlla se l'utente è già presente un api key
        // TODO: Save the api key in the keystore
        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        val apiKey = sharedPref.getString("API_KEY", null)

        if (apiKey != null) {
            // Se l'API key esiste già, vai direttamente alla MainActivity
            navigateToMainActivity()
            return
        }

        // Inizializza le views
        usernameEditText = findViewById(R.id.usernameInput)
        submitButton = findViewById(R.id.startButton)
        serverEditText = findViewById(R.id.serverInput)

        submitButton.setOnClickListener {
            // When the button is clicked, get the username and the server from the EditText
            val username = usernameEditText.text.toString().trim()
            val server = serverEditText.text.toString().trim()

            if (username.isEmpty()) {
                Toast.makeText(this, "Inserisci un username", Toast.LENGTH_SHORT).show()
                return@setOnClickListener // Esci dal metodo setOnClickListener
            }

            if (server.isEmpty()) {
                Toast.makeText(this, "Inserisci un server", Toast.LENGTH_SHORT).show()
                return@setOnClickListener // Esci dal metodo setOnClickListener
            }

            // Invia l'username all'API
            registerUser(username, server)
        }
    }

    private fun registerUser(username: String, server: String) {

        // Creazione dell'istanza Retrofit
        val retrofit = Retrofit.Builder()
            .baseUrl(server)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)
        val request = UserRequest(username)

        apiService.registerUser(request).enqueue(object : Callback<ApiResponse> {
            override fun onResponse(call: Call<ApiResponse>, response: Response<ApiResponse>) {
                if (response.isSuccessful) {
                    val apiResponse = response.body()
                    apiResponse?.let {
                        // Salva l'API key nelle SharedPreferences (it.apiKey è la chiave restituita dall'API)
                        saveApiKey(it.apiKey)

                        // Vai alla MainActivity
                        navigateToMainActivity()
                    }
                } else {
                    Toast.makeText(this@WelcomeActivity,
                        "Errore: ${response.code()}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<ApiResponse>, t: Throwable) {
                Toast.makeText(this@WelcomeActivity,
                    "Errore di connessione: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun saveApiKey(apiKey: String) {
        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("API_KEY", apiKey)
            apply()
        }
    }

    private fun navigateToMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish() // Chiudi questa activity per evitare che l'utente possa tornare indietro
    }
}

// Data class per la richiesta
data class UserRequest(val username: String)

// Data class per la risposta
data class ApiResponse(val apiKey: String)

// Interfaccia Retrofit per le chiamate API
interface ApiService {
    @POST("/api/generateApiKey/") // Sostituisci con l'endpoint corretto
    fun registerUser(@Body request: UserRequest): Call<ApiResponse>
}