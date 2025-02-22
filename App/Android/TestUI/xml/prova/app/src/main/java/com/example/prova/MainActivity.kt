package com.example.prova

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity(), View.OnClickListener {

    lateinit var btnSend : Button
    lateinit var messageContent : EditText
    lateinit var messageContainer : LinearLayout


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        btnSend = findViewById<Button>(R.id.btn_send)
        messageContent = findViewById<EditText>(R.id.msg_contnt)
        messageContainer = findViewById<LinearLayout>(R.id.message_container)

        btnSend.setOnClickListener(this)
    }

    override fun onClick(v: View?) {
        var a = messageContent.text.toString()
        when(v?.id){
            R.id.btn_send->{
                if (a.isNotEmpty()){
                    val messageBubble = TextView(this).apply{
                        text = a
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
            }
        }
    }
}