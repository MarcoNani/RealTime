package com.example.prova

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.util.UUID


// CLASSESSSS
data class Message(
    val typing: Boolean,
    val name: String,
    val payload: String,
    val time: String,
    val msgId: String
)




class MainActivity : AppCompatActivity(), View.OnClickListener {

    // FUNCTIONSSSS
    fun scrollToBottom() {
        val scrollView = findViewById<ScrollView>(R.id.scroll_view)
        scrollView.post {
            scrollView.fullScroll(View.FOCUS_DOWN)
        }
    }



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

        // listener for the textchange in the message content
        messageContent.addTextChangedListener(object: TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                // nothing
            }

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                // nothing
            }

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                // While the text is changing (use this to update the UI in realtime)
                // Toast.makeText(this@MainActivity, "Text changed:$s", Toast.LENGTH_SHORT).show()

                // Create a new message or update the content of the existing message
                if (LocalMessageId == "") {
                    // Create a new message


                    // Create a new message object
                    val messageObj = Message(false, "Me", s.toString(), "13:30", UUID.randomUUID().toString())

                    // Update the local message id in the global variable
                    LocalMessageId = messageObj.msgId

                    // Send the message to the server
                    // ...


                    // Call the receiveMessage function to fake the receiving from the server
                    receiveMessage(messageObj)
                } else {
                    // Update the existing message


                    // Create a new message object (with the same id as the existing message)
                    val messageObj = Message(false, "Me", s.toString(), "13:30", LocalMessageId)

                    // Send the message to the server
                    // ...


                    // Call the receiveMessage function to fake the receiving from the server
                    receiveMessage(messageObj)
                }
            }


        })

    }


    fun sendMessage(msg: String) {
        if (msg.isEmpty()) return

        // Simulate the pressure of the enter button (set the LocalMessageId = "")
        LocalMessageId = ""

        // Clear the textbox
        messageContent.text.clear()
    }

    fun receiveMessage(msg: Message) {
        // add a new message bubble
        drawBubble(msg)

        if (KeepTheChatDown){
            // Scroll to the bottom
            scrollToBottom()
        }else{
            // nothing
        }
    }


    fun drawBubble(msg: Message) {
        // if the message with the passed id has already been drawn update the content, else draw a new one
        // check if a message bubble with the passed id already exists
        val messageBubble = messageContainer.findViewWithTag<LinearLayout>(msg.msgId)

        if (messageBubble != null) {
            // Update the message content

            val textView: TextView = messageBubble.findViewById(R.id.message_text)
            textView.text = msg.payload
            return
        }else{
            // Create a new message bubble

            // Inflate the message bubble layout (import the XML layout file)
            val newMessageBubble = layoutInflater.inflate(R.layout.message_bubble, null) as LinearLayout

            // Set a message id
            newMessageBubble.tag = msg.msgId

            // Set the message content
            val textView: TextView = newMessageBubble.findViewById(R.id.message_text)
            textView.text = msg.payload


            // Set the message timestamp
            val messageTime = newMessageBubble.findViewById<TextView>(R.id.message_time)
            messageTime.text = msg.time


            // Add the message bubble to the message container
            messageContainer.addView(newMessageBubble)
        }
    }



    override fun onClick(v: View?) {

    }


}