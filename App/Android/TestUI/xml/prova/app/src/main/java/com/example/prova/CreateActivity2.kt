package com.example.prova

import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity

import android.widget.ImageView
import android.widget.TextView

class CreateActivity2 : AppCompatActivity() {

    private lateinit var leds: List<View>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_2)

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

        debug(debugTextView, "Start 2")


        // Set all leds to off
        setLedState(0, false)
        setLedState(1, false)
        setLedState(2, false)
        setLedState(3, false)
        setLedState(4, false)
        setLedState(5, false)
        setLedState(6, false)

        // Set 0,1,2 leds to on
        setLedState(0, true)
        setLedState(1, true)
        setLedState(2, true)



        








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




}
