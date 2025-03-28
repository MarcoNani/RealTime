import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { connect, close } from "./db.js";
import { config } from "dotenv";

config(); //per utilizzare il .env

const app = express();
app.use(express.json()); // Add this line before your routes to parse JSON bodies

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

async function getUserFromApiKey(apiKey) {
  const user = await collection.findOne({ apiKey: apiKey });
  return user;
}

const users = {};
const messages = []; // Array contenente i messaggi (associazione messaggio utente)

const generateApiKey_route = "/generateApiKey";
const changeUserName_route = "/changeUserName";

async function api_key_generator() {
  // WARNING: when uuidv4 will finish the program will be stuck in an infinite loop
  let api_key;
  do {
    api_key = uuidv4().replace(/-/g, "");
  } while ((await collection.find({ apiKey: api_key }).toArray()).length !== 0);
  return api_key;
}

app.post(generateApiKey_route, async (req, res) => {
  try {
    const username = req.body.username; // Estrai il nome utente dal corpo della richiesta
    const user = username || `Utente-${Math.floor(Math.random() * 1000)}`; // Genera un nome utente casuale se non fornito

    const api_key = await api_key_generator(); // Genera la chiave API

    const result = await collection.insertOne({
      apiKey: api_key,
      username: user,
    }); // Inserisce i dati nel database

    if (!result.acknowledged) {
      throw new Error("Document insertion failed");
    }

    console.log("Inserted ID:", result.insertedId);

    return res.status(201).json({
      message: `API key generated and stored successfully for user: ${user}`,
      data: {
        apiKey: api_key,
        username: user,
      },
    });
  } catch (error) {
    console.error("Error inserting user:", error);
    return res.status(500).json({
      message: "An error occurred while generating or storing the API key.",
      error: error.message,
    });
  }
});

app.put(changeUserName_route, async (req, res) => {
  try {
    const { apiKey, newName } = req.body; // Estrai apiKey e newName dal corpo della richiesta
    if (!apiKey || !newName) {
      return res
        .status(400)
        .json({ message: "apiKey and newName are required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await getUserFromApiKey(apiKey);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Aggiorna il nome utente
    const result = await collection.updateOne(
      { apiKey: apiKey },
      { $set: { username: newName } }
    );

    if (!result.acknowledged) {
      throw new Error("Document update failed");
    }

    console.log(
      `User ${user.apiKey} changed name from ${user.username} to ${newName}`
    );

    return res.status(200).json({
      message: `Username updated successfully from ${user.username} to ${newName}`,
      data: {
        apiKey: apiKey,
        username: newName,
      },
    });
  } catch (error) {
    console.error("Error updating username", error);
    return res.status(500).json({
      message: "An error occurred while updating the username",
      error: error.message,
    });
  }
});

/* function user_data(socket) {
  // Funzione che restituisce tutti i dati necessari per memorizzare l'user in un oggetto {id: userID, name: username}
  let userId = users[socket.id]?.id || uuidv4();
  let username =
    users[socket.id]?.name || `Utente-${Math.floor(Math.random() * 1000)}`;
  return { id: userId, name: username, auth: false };
} */

function display(item_to_display) {
  io.emit("display", item_to_display);
}
//---------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------//
/* 
    TODO: cache users when the user connects with the socket
    TODO: remove from cache the user when the user closes the socket
*/

io.on("connection", (socket) => {
  io.emit("mustAuth");

  socket.on("auth", async (apiKey) => {
    try {
      let user = getUserFromApiKey(apiKey);
      if (!user) {
        throw "Inexistent user";
      }
      users[socket.id] = { user: user, is_auth: true };
    } catch (error) {}
  });

  // let user = user_data(socket); // ottengo tramite la funzione user_data l'oggetto user completo di username e userid
  // users[socket.id] = user; // essendo già user un oggetto lo inserisco direttamente nell'array
  // TODO: fix to make this work console.log(`Utente connesso: ${user.name} (${user.id})`);

  //socket.emit("setUsername", user.name); // Invia solo al client connesso il suo username

  //let user;

  /* socket.on("setUsername", async (payload) => {
    //TODO: convert in un api endpoint
    // PAYLOAD SCHEMA
    /*
    {
    apiKey: apiKey,
    newName: usernameNew   
    }
     */
  /* 

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
  }); */

  socket.on("typing", (payload) => {
    // Riceve il messaggio di scrittura
    if (!users[socket.id].is_auth) {
      display("Hacker");
    } else if (payload.msg_id) {
      // controlla se il messaggio contiene un id messaggio
      // verifica che l'id del messaggio corrisponda ad un messaggio dell'utente corrente (guardando nella lista dei messaggi)
      console.log("Received message with local message id: " + payload.msg_id);
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

  socket.on("disconnect", () => {
    // Quando un utente si disconnette
    console.log(`Utente disconnesso: ${user.name} (${user.id})`); // Logga la disconnessione
    delete users[socket.id]; // Rimuove l'utente dalla lista
  });
});

server.listen(port_server, () => {
  console.log(`Server in ascolto su http://localhost:${port_server}`);
});
