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

    // Variabili per gestire l'aggiornamento del messaggio in tempo reale
    private var LocalMessageId: String = ""
    private var keepTheChatDown: Boolean = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Assicurati che il flag adjustResize sia impostato
        window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        setContentView(R.layout.activity_main)

        // Collega le view definite in XML
        btnSend = findViewById(R.id.btn_send)
        messageContent = findViewById(R.id.msg_contnt)
        recyclerView = findViewById(R.id.recycler_view)

        // Configura il RecyclerView
        messageAdapter = MessageAdapter(messages)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = messageAdapter

        // Gestione del pulsante Send
        btnSend.setOnClickListener { sendMessage(messageContent.text.toString()) }

        // Listener per aggiornamenti in tempo reale dell'EditText
        messageContent.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                // Niente qui
            }

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                // Niente qui
            }

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val text = s.toString()
                if (LocalMessageId.isEmpty()) {
                    // Creazione di un nuovo messaggio
                    val messageObj = Message(
                        typing = false,
                        name = "Me",
                        payload = text,
                        time = "13:30",
                        msgId = UUID.randomUUID().toString()
                    )
                    LocalMessageId = messageObj.msgId
                    receiveMessage(messageObj)
                } else {
                    // Aggiornamento del messaggio esistente
                    val messageObj = Message(
                        typing = false,
                        name = "Me",
                        payload = text,
                        time = "13:30",
                        msgId = LocalMessageId
                    )
                    receiveMessage(messageObj)
                }
            }
        })
    }

    private fun sendMessage(msg: String) {
        if (msg.isEmpty()) return

        // Simula l'invio del messaggio e resetta l'ID locale
        LocalMessageId = ""
        // Pulisce l'EditText
        messageContent.text.clear()
    }

    private fun receiveMessage(msg: Message) {
        // Se esiste già un messaggio con lo stesso id, aggiorna il contenuto; altrimenti, aggiungilo
        val index = messages.indexOfFirst { it.msgId == msg.msgId }
        if (index != -1) {
            messageAdapter.updateMessage(msg)
        } else {
            messageAdapter.addMessage(msg)
        }
        if (keepTheChatDown) {
            scrollToBottom()
        }
    }

    private fun scrollToBottom() {
        recyclerView.scrollToPosition(messageAdapter.itemCount - 1)
    }
}
