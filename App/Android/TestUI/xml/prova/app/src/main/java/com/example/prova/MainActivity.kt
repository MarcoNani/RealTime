package com.example.prova

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity(), View.OnClickListener {

    // lateinit let you declare variable without initializing them immediately
    lateinit var btnSend : Button
    lateinit var messageContent : EditText
    lateinit var messageContainer : LinearLayout


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main) // link the UI defined in the XML to the kotlin code of the activity

        // link the variable to the element by it's ID
        btnSend = findViewById<Button>(R.id.btn_send)
        messageContent = findViewById<EditText>(R.id.msg_contnt)
        messageContainer = findViewById<LinearLayout>(R.id.message_container)

        btnSend.setOnClickListener { sendMessage(messageContent.text.toString()) } // listener at the click on the button, it exec the onClick function
    }


    fun sendMessage(msg: String) {
        if (msg.isEmpty()) return

        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

        // add a new message bubble
        val messageBubble = TextView(this).apply{
            text = msg
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(16,8,16,8)
            setBackgroundResource(android.R.drawable.dialog_holo_light_frame)
        }

        messageContainer.addView(messageBubble)
        messageContent.text.clear()


    }

    override fun onClick(v: View?) {

    }
}