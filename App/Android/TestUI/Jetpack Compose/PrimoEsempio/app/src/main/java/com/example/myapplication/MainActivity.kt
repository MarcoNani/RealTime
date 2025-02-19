package com.example.myapplication

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.myapplication.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyApplicationTheme {
                ChatApp()
            }
        }
    }
}


/**
 * ChatApp: Composable principale che rappresenta l'interfaccia della chat.
 *
 * Struttura:
 * 1. Stato:
 *    - inputText: il testo attualmente digitato nel TextField.
 *    - messages: la lista dei messaggi inviati.
 *
 * 2. Layout:
 *    - Una Column che contiene:
 *       a. Un LazyColumn per mostrare i messaggi in un contenitore scrollabile.
 *       b. Una Row con un TextField e un Button per l'invio dei messaggi.
 */

@Composable
fun ChatApp() {
    // Stato per il testo in input
    var inputText by remember { mutableStateOf("") }

    // Lista dei messaggi (stato mutabile) per aggiornare automaticamente la UI
    val messages = remember { mutableStateListOf<String>() }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Contenitore scrollabile per i messaggi
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(8.dp)
            ) {
                // Visualizza ogni messaggio utilizzando la composable MessageBubble
                items(messages) { message ->
                    MessageBubble(message = message)
                }
            }

            // Campo di input e pulsante per inviare i messaggi
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Contenuto della riga

                TextField( // Primo elemento della riga
                    value = inputText,
                    onValueChange = { inputText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Scrivi un messaggio")}
                )
                Spacer(modifier = Modifier.width(8.dp)) // Secondo elemento della riga
                Button(onClick = { // Terzo elemento della riga
                    // Aggiunge il messaggio se non è vuoto e resetta il campo di input
                    if (inputText.isNotBlank()) {
                        messages.add(inputText)
                        inputText = ""
                    }
                }) {
                    Text("Invia")
                }
            }
        }
    }


}


/**
 * MessageBubble: Composable che definisce lo stile della "bolla" del messaggio.
 *
 * Personalizza il background, il padding e gli angoli arrotondati per creare
 * l'effetto bolla tipico delle chat.
 */
@Composable
fun MessageBubble(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(
                color = MaterialTheme.colorScheme.primary,
                shape = RoundedCornerShape(8.dp)
            )
            .padding(8.dp)
    ) {
        Text(
            text = message,
            color = MaterialTheme.colorScheme.onPrimary
        )
    }
}




// Preview per la modalità luce
@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_NO, showSystemUi = true)
@Composable
fun LightModeChatPreview() {
    MyApplicationTheme {
        ChatApp()
    }
}

// Preview per la modalità scura
@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES, showSystemUi = true)
@Composable
fun DarkModeChatPreview() {
    MyApplicationTheme {
        ChatApp()
    }
}



// Codice vecchio per l'app del contatore
/*
@Composable
fun CounterApp() {
    // Stato del contatore
    var count by remember { mutableStateOf(0) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box (
            contentAlignment = Alignment.Center,
            modifier = Modifier.fillMaxSize()
        ){
            Column(
                modifier = Modifier
                    .windowInsetsPadding(WindowInsets.statusBars) // Evita sovrapposizione statusbar
                    .padding(16.dp)
            ) {
                Text(
                    text = "Contatore: $count",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(10.dp))
                Button(onClick = { count++ }) {
                    Text(text = "Aumenta")
                }
            }
        }
    }

}

@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_NO, showSystemUi = true)
@Composable
fun LightModePreview() {
    MyApplicationTheme {
        CounterApp()
    }
}

@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES, showSystemUi = true)
@Composable
fun DarkModePreview() {
    MyApplicationTheme {
        CounterApp()
    }
}
*/
