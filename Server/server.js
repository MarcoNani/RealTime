const { time } = require("console");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port_server = 3000;

const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Cambia con il tuo username MySQL
  password: "", // Cambia con la tua password MySQL
  database: "chat_app",
});

db.connect((err) => {
  if (err) {
    console.error("Errore di connessione al database:", err);
  } else {
    console.log("Connesso al database MySQL");
  }
});

app.use(express.static("public")); // Serve il frontend statico

db.query(
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL
  )`,
  (err) => {
    if (err) console.error("Errore nella creazione della tabella:", err);
  }
);

const users = {};
const messages = []; // Array contenente i messaggi (associazione messaggio utente)

/* function authenticate(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return res.status(403).json({ error: "API Key richiesta" });

  db.query(
    "SELECT * FROM users WHERE api_key = ?",
    [apiKey],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Errore interno" });
      if (results.length === 0)
        return res.status(403).json({ error: "API Key non valida" });
      req.user = results[0];
      next();
    }
  );
} */

app.get("/generateApiKey", (req, res) => {
  const username = `Utente-${Math.floor(Math.random() * 1000)}`;
  const userId = uuidv4();
  const apiKey = uuidv4().replace(/-/g, "");

  db.query(
    "INSERT INTO users (id, username, api_key) VALUES (?, ?, ?)",
    [userId, username, apiKey],
    (err) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Errore nella generazione della API Key" });
      res.json({ userId, username, apiKey });
    }
  );
});

function user_data(socket) {
  // Funzione che restituisce tutti i dati necessari per memorizzare l'user in un oggetto {id: userID, name: username}
  let userId = users[socket.id]?.id || uuidv4();
  let username =
    users[socket.id]?.name || `Utente-${Math.floor(Math.random() * 1000)}`;
  return { id: userId, name: username, auth: false };
}

function display(item_to_display) {
  io.emit("display", item_to_display);
}

io.on("connection", (socket) => {
  socket.on("auth", (apiKey) => {
    db.query(
      "SELECT * FROM users WHERE api_key = ?",
      [apiKey],
      (err, results) => {
        if (err || results.length === 0) {
          socket.emit("authFailed");
        } else {
          users[socket.id];
        }
      }
    );
  });
  if (err || results.length === 0) {
    socket.emit("authFailed");
  } else {
    socket.emit("authSuccess", user.username);
    let user = user_data(socket); // ottengo tramite la funzione user_data l'oggetto user completo di username e userid
    users[socket.id] = user; // essendo già user un oggetto lo inserisco direttamente nell'array
    console.log(`Utente connesso: ${user.name} (${user.id})`);

    socket.emit("setUsername", user.name); // Invia solo al client connesso il suo username

    socket.on("setUsername", (newName) => {
      // Riceve il nuovo nome dall'utente
      user.name = newName;
      users[socket.id].name = newName; // Aggiorna il nome dell'utente
      console.log(`Utente ${user.id} ha cambiato nome in ${user.name}`); // Logga il cambio di nome
    });

    socket.on("typing", (payload) => {
      // Riceve il messaggio di scrittura

      console.log(messages);

      if (payload.msg_id) {
        // controlla se il messaggio contiene un id messaggio
        // verifica che l'id del messaggio corrisponda ad un messaggio dell'utente corrente (guardando nella lista dei messaggi)
        console.log(
          "Received message with local message id: " + payload.msg_id
        );
        if (
          messages.find(
            (msg) => msg.msg_id === payload.msg_id && msg.id === socket.id
          )
        ) {
          // Il messaggio è dell'utente corrente
          console.log("Message is from current user");
          // Aggiorna il messaggio con il nuovo payload
          const message_obj = {
            name: users[socket.id].name,
            payload: payload.text,
            time: new Date(),
            msg_id: payload.msg_id,
          }; // realizzo l'oggetto contenente i dettagli sul messaggio
          display(message_obj); // Invia a tutti i client l'oggetto messaggio
        } else {
          console.log("Message is not from current user");
          display("Hacker"); // Invia a tutti i client l'oggetto di errore
        }
      } else {
        // Se il messaggio non contiene un id messaggio
        // creo un nuovo messaggio con un nuovo id
        const message_obj = {
          name: users[socket.id].name,
          payload: payload.text,
          time: new Date(),
          msg_id: uuidv4(),
        }; // realizzo l'oggetto contenente i dettagli sul messaggio
        display(message_obj); // Invia a tutti i client l'oggetto messaggio
        messages.push({ id: socket.id, msg_id: message_obj.msg_id }); // Aggiungo l'oggetto messaggio alla lista dei messaggi
      }
    });
  }

  socket.on("disconnect", () => {
    // Quando un utente si disconnette
    console.log(`Utente disconnesso: ${user.name} (${user.id})`); // Logga la disconnessione
    delete users[socket.id]; // Rimuove l'utente dalla lista
  });
});

server.listen(port_server, () => {
  console.log(`Server in ascolto su http://localhost:${port_server}`);
});
