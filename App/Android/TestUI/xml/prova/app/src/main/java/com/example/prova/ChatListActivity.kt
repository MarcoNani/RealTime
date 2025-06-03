package com.example.prova

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.google.android.material.floatingactionbutton.FloatingActionButton

class ChatListActivity : AppCompatActivity() {

    private var isFabMenuOpen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat_list)

        val mainFab = findViewById<FloatingActionButton>(R.id.floatingActionButton)
        val fabA = findViewById<ExtendedFloatingActionButton>(R.id.fab_A)
        val fabB = findViewById<ExtendedFloatingActionButton>(R.id.fab_B)
        val overlay = findViewById<View>(R.id.overlay)

        mainFab.setOnClickListener {
            if (isFabMenuOpen) {
                closeFabMenu(fabA, fabB)
                rotateFab(mainFab, false)
                overlay.visibility = View.GONE
            } else {
                openFabMenu(fabA, fabB)
                rotateFab(mainFab, true)
                overlay.visibility = View.VISIBLE
            }
            isFabMenuOpen = !isFabMenuOpen
        }

        fabA.setOnClickListener {
            startActivity(Intent(this, CreateRoomActivity::class.java))
            closeFabMenu(fabA, fabB)
            rotateFab(mainFab, false)
            overlay.visibility = View.GONE
            isFabMenuOpen = false
        }

        fabB.setOnClickListener {
            startActivity(Intent(this, JoinRoomActivity::class.java))
            closeFabMenu(fabA, fabB)
            rotateFab(mainFab, false)
            overlay.visibility = View.GONE
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
