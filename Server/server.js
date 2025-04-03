import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { connect, close } from "./db.js";
import { config } from "dotenv";

config(); //per utilizzo .env

const app = express();
app.use(express.json()); // per parse JSON bodies

app.use(express.static("public")); // per frontend statico

const server = http.createServer(app);
const io = new Server(server);

const port_server = process.env.PORTA || 3000;

// ----------
//     DB
// ----------

let dbclient;
let db;
let usersCollection;
let roomsCollection;

try {
  dbclient = await connect();
  db = dbclient.db(process.env.DB_NAME);
  usersCollection = db.collection(process.env.USERSCOLLECTION_NAME);
  roomsCollection = db.collection(process.env.ROOMSCOLLECTION_NAME);
  console.log("Connessione al database avvenuta con successo.");
} catch (e) {
  console.error("errore durante la connessione al database: ", e);
}

//// FUNCTIONS ////

async function getUserFromApiKey(apiKey) {
  const user = await usersCollection.findOne({ apiKey: apiKey });
  return user;
}

async function api_key_generator() {
  // WARNING: when uuidv4 will finish the program will be stuck in an infinite loop
  let api_key;
  do {
    api_key = uuidv4().replace(/-/g, "");
  } while (
    (await usersCollection.find({ apiKey: api_key }).toArray()).length !== 0
  );
  return api_key;
}

function display(item_to_display) {
  io.emit("display", item_to_display);
}

//// CONSTANTS ////

const users = {};
const messages = []; // Array contenente i messaggi (associazione messaggio utente)

//// ENDPOINTS ////

// users
const generateApiKey_route = "/api/generateApiKey";
const changeUserName_route = "/api/changeUserName";

// rooms
const createRoom_route = "/api/createRoom"; // POST
const requireJoinRoom_route = "/api/requireJoinRoom"; // POST
const listJoinRequests_route = "/api/listJoinRequests"; // GET
const approveJoinRequest_route = "/api/approveJoinRequest"; // PATCH
const denyJoinRequest_route = "/api/denyJoinRequest"; // PATCH
const exitRoom_route = "/api/exitRoom"; // DELETE
const listRoomMembers_route = "/api/listRoomMembers"; // GET
const listMyRooms_route = "/api/listMyRooms"; // GET

//////// USERS ////////

app.post(generateApiKey_route, async (req, res) => {
  try {
    const username =
      req.body.username || `Utente-${Math.floor(Math.random() * 1000)}`; // Estrai il nome utente dal corpo della richiesta o genera casuale se non fornito

    const api_key = await api_key_generator(); // Genera la chiave API

    const result = await usersCollection.insertOne({
      apiKey: api_key,
      username: username,
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
    const result = await usersCollection.updateOne(
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

//////// ROOMS ////////

app.post(createRoom_route, async (req, res) => {
  try {
    const api_key = req.body.apiKey; // Estrai apiKey dal corpo della richiesta
    if (!api_key) {
      return res.status(400).json({ message: "apiKey is required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await getUserFromApiKey(api_key);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Genera un nuovo ID per la stanza
    const roomId = uuidv4(); // Genera un ID unico per la stanza

    // Crea la stanza nel database
    const result = await roomsCollection.insertOne({
      roomId: roomId,
      members: [api_key], // Aggiungi l'utente come membro della stanza
      createdAt: new Date(),
    });

    // Verifica se l'inserimento è andato a buon fine
    if (!result.acknowledged) {
      throw new Error("Room creation failed");
    }
    console.log("Inserted Room ID:", result.insertedId);

    return res.status(201).json({
      message: `Room created successfully with ID: ${roomId}`,
      data: {
        roomId: roomId,
        members: [api_key], // Includi i membri della stanza
      },
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return res.status(500).json({
      message: "An error occurred while creating the room",
      error: error.message,
    });
  }
});

//---------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------//
/* 
    TODO: cache users when the user connects with the socket
    TODO: remove from cache the user when the user closes the socket
*/

io.on("connection", (socket) => {
  io.emit("mustAuth"); //per prima cosa richiede al client di autenticarsi

  socket.on("auth", async (apiKey) => {
    //arriva la richiesta di autenticazione al server
    try {
      let user = getUserFromApiKey(apiKey); //controlla l'esistenza dell'user
      if (!user) {
        throw "Inexistent user";
      }
      users[socket.id] = { user: user }; //caches the user
    } catch (error) {}
  });

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
