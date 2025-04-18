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
import com.google.android.material.floatingactionbutton.FloatingActionButton
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

        val mainFab = findViewById<FloatingActionButton>(R.id.floatingActionButton)
        val fabA = findViewById<ExtendedFloatingActionButton>(R.id.fab_A)
        val fabB = findViewById<ExtendedFloatingActionButton>(R.id.fab_B)

        mainFab.setOnClickListener {
            if (isFabMenuOpen) {
                closeFabMenu(fabA, fabB)
                rotateFab(mainFab, false)
            } else {
                openFabMenu(fabA, fabB)
                rotateFab(mainFab, true)
            }
            isFabMenuOpen = !isFabMenuOpen
        }

        fabA.setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java))
            closeFabMenu(fabA, fabB)
            rotateFab(mainFab, false)
            isFabMenuOpen = false
        }

        fabB.setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java))
            closeFabMenu(fabA, fabB)
            rotateFab(mainFab, false)
            isFabMenuOpen = false
        }
    }

    private fun openFabMenu(vararg fabs: ExtendedFloatingActionButton) {
        fabs.forEachIndexed { index, fab ->
            fab.visibility = View.VISIBLE
            fab.alpha = 0f
            fab.translationY = 50f
            fab.animate()
                .alpha(1f)
                .translationY(0f)
                .setStartDelay(index * 50L)
                .setDuration(200)
                .start()
        }
    }

    private fun closeFabMenu(vararg fabs: ExtendedFloatingActionButton) {
        fabs.forEachIndexed { index, fab ->
            fab.animate()
                .alpha(0f)
                .translationY(50f)
                .setStartDelay(index * 30L)
                .setDuration(150)
                .withEndAction { fab.visibility = View.GONE }
                .start()
        }
    }

    private fun rotateFab(fab: FloatingActionButton, rotate: Boolean) {
        val rotationAngle = if (rotate) 45f else 0f
        fab.animate()
            .rotation(rotationAngle)
            .setDuration(200)
            .start()
    }

}
