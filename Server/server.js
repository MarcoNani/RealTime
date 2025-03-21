import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { connect, close } from "./db.js";
import { config } from "dotenv";

config(); //per utilizzare il .env

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const port_server = 3000;

let dbclient;
let db;
let collection;

try {
  dbclient = await connect();
  db = dbclient.db(process.env.DB_NAME);
  collection = db.collection(process.env.COLLECTION_NAME);

  //const users = await collection.find().toArray();
} catch (e) {
  console.error("errore durante la connessione al database: ", e);
}

app.use(express.static("public")); // Serve il frontend statico

const users = {};
const messages = []; // Array contenente i messaggi (associazione messaggio utente)

/* 
    TODO: cache users when the user connects with the socket
    TODO: remove from cache the user when the user closes the socket
*/

app.get("/generateApiKey", async (req, res) => {
  // TODO:
  const username = `Utente-${Math.floor(Math.random() * 1000)}`; // TODO: mettere l'utente preso dalla request
  const api_key = uuidv4().replace(/-/g, "");

  try {
    const result = await collection.insertOne({
      apiKey: api_key,
      username: username,
    });
    if (result.acknowledged) {
      console.log("Inserted ID:", result.insertedId);
    } else {
      console.log("Document insertion failed!");
      throw "not aknowledged";
    }
  } catch (error) {
    console.error("Error inserting user:", error);
    return "Error inserting user", 500;
  }
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
