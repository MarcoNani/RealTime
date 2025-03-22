import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { connect, close } from "./db.js";
import { config } from "dotenv";

config(); //per utilizzare il .env

const app = express();

app.use(express.static("public")); // Serve il frontend statico

const server = http.createServer(app);
const io = new Server(server);

const port_server = process.env.PORTA || 3000;

let dbclient;
let db;
let collection;

try {
  dbclient = await connect();
  db = dbclient.db(process.env.DB_NAME);
  collection = db.collection(process.env.COLLECTION_NAME);
} catch (e) {
  console.error("errore durante la connessione al database: ", e);
}

const users = {};
const messages = []; // Array contenente i messaggi (associazione messaggio utente)

app.get("/generateApiKey/u/:user", async (req, res) => {
  const username =
    req.params.user || `Utente-${Math.floor(Math.random() * 1000)}`;
  let api_key;
  do {
    api_key = uuidv4().replace(/-/g, "");
  } while ((await collection.find({ apiKey: api_key }).toArray()).length !== 0);
  // WARNING: when uuidv4 will finish the program will be stuck in an infinite loop

  try {
    const result = await collection.insertOne({
      apiKey: api_key,
      username: username,
    });
    if (result.acknowledged) {
      console.log("Inserted ID:", result.insertedId);
      res.status(200).json({
        endpoint: "/generateApiKey/u/:user",
        status: 200,
        data: { apiKey: api_key, username: username },
      });
    } else {
      console.log("Document insertion failed!");
      throw "not aknowledged";
    }
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).json({
      endpoint: "/generateApiKey/u/:user",
      status: 500,
      data: { error: error },
    });
  }
});

app.get("changeUserName/u/:newName/a/:apiKey", async (req, res) => {
  try {
    // Try to find the user details with the given apiKey
    user = await collection.findOne({ apiKey: req.payload.apiKey });
    if (!user) {
      throw "Inexistent user";
    }

    let result = collection.updateOne(
      { apiKey: apiKey }, // Filter
      { $set: { username: reqpayload.newName } } // Update operation
    );
    if (result.acknowledged) {
      console.log("Inserted ID:", result.upsertedId);
      console.log(
        `Utente ${user.apiKey} ha cambiato nome da ${user.username} in ${req.payload.newName}`
      );
      res.status(200).json({
        endpoint: "changeUserName/u/:newName/a/:apiKey",
        status: 200,
        data: {
          apiKey: apiKey,
          lastName: user.username,
          actualName: req.payload.newName,
        },
      });
    } else {
      console.log("Document edit failed!");
      throw "not aknowledged";
    }

    // TODO: caching users
    //users[socket.id].name = newName; // Aggiorna il nome dell'utente
    
  } catch (error) {
    // inserisco
    console.error("Errore nella modifica dell'username", error);
    res.status(500).json({
      endpoint: "changeUserName/u/:newName/a/:apiKey",
      status: 500,
      data: { error: error },
    });
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

/* 
    TODO: cache users when the user connects with the socket
    TODO: remove from cache the user when the user closes the socket
*/

io.on("connection", (socket) => {
  // let user = user_data(socket); // ottengo tramite la funzione user_data l'oggetto user completo di username e userid
  // users[socket.id] = user; // essendo già user un oggetto lo inserisco direttamente nell'array
  // TODO: fix to make this work console.log(`Utente connesso: ${user.name} (${user.id})`);

  //socket.emit("setUsername", user.name); // Invia solo al client connesso il suo username

  let user;

  socket.on("setUsername", async (payload) => {
    //TODO: convert in un api endpoint
    // PAYLOAD SCHEMA
    /*
    {
    apiKey: apiKey,
    newName: usernameNew   
    }
    */

    // Riceve il nuovo nome dall'utente
    try {
      // Try to find the user details with the given apiKey
      user = await collection.findOne({ apiKey: payload.apiKey });
      if (!user) {
        throw "Inexistent user";
      }

      collection.updateOne(
        { apiKey: apiKey }, // Filter
        { $set: { username: payload.newName } } // Update operation
      );

      console.log(
        `Utente ${payload.apiKey} ha cambiato nome da ${user.username} in ${payload.newName}`
      );

      // TODO: caching users
      //users[socket.id].name = newName; // Aggiorna il nome dell'utente
    } catch (e) {
      console.error("Errore nella modifica dell'username", e);
    } // Logga il cambio di nome
  });

  socket.on("typing", (payload) => {
    // Riceve il messaggio di scrittura
    try {
      console.log(messages);
      if (collection.find({ apiKey: payload.apiKey }).to_array().length === 0) {
        throw "Inexistent user";
      }
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
    } catch (e) {
      console.error("error sending the message: ", e);
    }
  });

  socket.on("disconnect", () => {
    // Quando un utente si disconnette
    console.log(`Utente disconnesso: ${user.name} (${user.id})`); // Logga la disconnessione
    delete users[socket.id]; // Rimuove l'utente dalla lista
  });
});

server.listen(port_server, () => {
  console.log(`Server in ascolto su http://localhost:${port_server}`);
});
