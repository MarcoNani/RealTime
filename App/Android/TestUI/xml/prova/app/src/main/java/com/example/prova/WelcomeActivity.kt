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

import com.example.prova.api.ApiService
import com.example.prova.api.RetrofitProvider
import com.example.prova.model.ApiResponse
import com.example.prova.model.ApiData
import com.example.prova.model.UserRequest


class WelcomeActivity : AppCompatActivity() {

    private lateinit var usernameEditText: EditText
    private lateinit var submitButton: Button
    private lateinit var serverEditText: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_welcome)

        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        val apiKey = sharedPref.getString("API_KEY", null)

        // toast api key da togliere prima della produzione
        Toast.makeText(this, "API key: $apiKey", Toast.LENGTH_SHORT).show()

        if (apiKey != null) {
            navigateToChatListActivity()
            return
        }

        usernameEditText = findViewById(R.id.usernameInput)
        submitButton = findViewById(R.id.startButton)
        serverEditText = findViewById(R.id.serverInput)

        submitButton.setOnClickListener {
            val username = usernameEditText.text.toString().trim()
            val server = serverEditText.text.toString().trim()

            if (username.isEmpty()) {
                Toast.makeText(this, "Inserisci un username", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (server.isEmpty()) {
                Toast.makeText(this, "Inserisci un server", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            registerUser(username, server)
        }
    }

    private fun registerUser(username: String, server: String) {
        val retrofit = RetrofitProvider.provideRetrofit(server)
        val apiService = retrofit.create(ApiService::class.java)
        val request = UserRequest(username)

        apiService.registerUser(request).enqueue(object : Callback<ApiResponse> {
            override fun onResponse(call: Call<ApiResponse>, response: Response<ApiResponse>) {
                if (response.isSuccessful) {
                    val apiResponse = response.body()
                    apiResponse?.let { apiResponseData ->
                        val apiKey = apiResponseData.data.apiKey
                        saveApiKey(apiKey)
                        saveServer(server)
                        navigateToChatListActivity()
                    }
                } else {
                    Toast.makeText(this@WelcomeActivity, "Errore: ${response.code()}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<ApiResponse>, t: Throwable) {
                Toast.makeText(this@WelcomeActivity, "Errore di connessione: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun saveApiKey(apiKey: String) {
        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("API_KEY", apiKey)
            apply()
            Toast.makeText(this@WelcomeActivity, "API key salvata con successo", Toast.LENGTH_SHORT).show()
        }
    }

    private fun saveServer(server: String) {
        val sharedPref = getSharedPreferences("RealTimePrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("SERVER_URL", server)
            apply()
            Toast.makeText(this@WelcomeActivity, "Server salvato con successo", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToChatListActivity() {
        val intent = Intent(this, ChatListActivity::class.java)
        startActivity(intent)
        finish()
    }
}