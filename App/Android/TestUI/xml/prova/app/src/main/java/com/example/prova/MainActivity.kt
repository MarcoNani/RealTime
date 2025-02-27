package com.example.prova

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.util.UUID

data class Message(
    val typing: Boolean,
    val name: String,
    val payload: String,
    val time: String,
    val msgId: String
)

class MainActivity : AppCompatActivity() {

    private lateinit var btnSend: Button
    private lateinit var messageContent: EditText
    private lateinit var recyclerView: RecyclerView
    private lateinit var messageAdapter: MessageAdapter
    private val messages = mutableListOf<Message>()

    // SET GLOBAL VARIABLES
    private var localMessageId: String = ""
    private var keepTheChatDown: Boolean = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE) // Needed to make the window not going under the keyboard
        
        setContentView(R.layout.activity_main)

        // Link the view components (XML) to the variables
        btnSend = findViewById(R.id.btn_send)
        messageContent = findViewById(R.id.msg_contnt)
        recyclerView = findViewById(R.id.recycler_view)

        // Config recyclerView
        messageAdapter = MessageAdapter(messages)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = messageAdapter

        // Listener for the send button
        btnSend.setOnClickListener { sendMessage(messageContent.text.toString()) }

        // Listener for text changes in messageContent
        messageContent.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                // Nothing
            }

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                // Nothing
            }

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val text = s.toString()

                if (localMessageId.isEmpty()) { // If the local message ID is empty
                    // Create a new message
                    val messageObj = Message(
                        typing = false,
                        name = "Me",
                        payload = text,
                        time = "13:30",
                        msgId = UUID.randomUUID().toString()
                    )
                    localMessageId = messageObj.msgId // Set the local message ID
                    receiveMessage(messageObj) // Fake the receive of the message
                } else {
                    // Update the existing message
                    val messageObj = Message(
                        typing = false,
                        name = "Me",
                        payload = text,
                        time = "13:30",
                        msgId = localMessageId
                    )
                    receiveMessage(messageObj) // Fake the receive of the message
                }
            }
        })
    }

    private fun sendMessage(msg: String) {
        if (msg.isEmpty()) return

        // Simulate the sending of a message and set the local message ID to ""
        localMessageId = ""
        // Clear the EditText
        messageContent.text.clear()
    }

    private fun receiveMessage(msg: Message) {
        // If the message already exists, update it; otherwise, add it
        val index = messages.indexOfFirst { it.msgId == msg.msgId } // Obtain the index of the first matching message or -1 if not found
        if (index != -1) { // If the message already exists
            messageAdapter.updateMessage(msg)
        } else { // If the message doesn't exist
            messageAdapter.addMessage(msg)
        }
        
        if (keepTheChatDown) {
            scrollToBottom()
        }
    }

    private fun scrollToBottom() {
        recyclerView.scrollToPosition(messageAdapter.itemCount - 1) // Scroll to the last position (last message)
    }
}
