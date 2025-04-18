package com.example.prova

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST

class ChatListActivity : AppCompatActivity() {

    private var isFabMenuOpen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat_list)

        val mainFab = findViewById<ExtendedFloatingActionButton>(R.id.floatingActionButton)
        val fabA = findViewById<ExtendedFloatingActionButton>(R.id.fab_A)
        val fabB = findViewById<ExtendedFloatingActionButton>(R.id.fab_B)

        // Listener for the main FAB
        mainFab.setOnClickListener {
            if (isFabMenuOpen) {
                fabA.animate().alpha(0f).translationY(0f).setDuration(200).withEndAction {
                    fabA.visibility = View.GONE
                }
                fabB.animate().alpha(0f).translationY(0f).setDuration(200).withEndAction {
                    fabB.visibility = View.GONE
                }
            } else {
                fabA.visibility = View.VISIBLE
                fabB.visibility = View.VISIBLE
                fabA.alpha = 0f
                fabB.alpha = 0f
                fabA.animate().alpha(1f).translationY(-80f).setDuration(200).start()
                fabB.animate().alpha(1f).translationY(-150f).setDuration(200).start()
            }
            isFabMenuOpen = !isFabMenuOpen
        }

        // Listener for the FAB A - start activity
        fabA.setOnClickListener {
            // startActivity(Intent(this, NfcCreateActivity::class.java))
            startActivity(Intent(this, MainActivity::class.java))
        }

        // Listener for the FAB B - start activity
        fabB.setOnClickListener {
            // startActivity(Intent(this, NfcJoinActivity::class.java))
            startActivity(Intent(this, MainActivity::class.java))
        }


    }
}