import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { connect, close } from "./db.js";
import { config } from "dotenv";
// Swagger
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";


// ----------
//  SWAGGER
// ----------

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "RealTime API",
      version: "1.0.0",
      description: "API per la gestione di utenti e stanze in tempo reale",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORTA || 3000}`,
        description: "Development server (development branch)",
      },
      {
        url: 'https://realtime-demo.baunon.com',
        description: "Demo production server (main branch)",
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ["./server.js"], // percorso ai file che contengono le annotazioni
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);




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
let joinRequestsCollection;

try {
  dbclient = await connect();
  db = dbclient.db(process.env.DB_NAME);
  usersCollection = db.collection(process.env.USERSCOLLECTION_NAME);
  roomsCollection = db.collection(process.env.ROOMSCOLLECTION_NAME);
  joinRequestsCollection = db.collection(process.env.JOINREQUESTSCOLLECTION_NAME);
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

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// users
const generateApiKey_route = "/api/users/generate-api-key";
const changeUserName_route = "/api/change-username";

// rooms
const createRoom_route = "/api/rooms/create"; // POST
const requireJoinRoom_route = "/api/rooms/join-request"; // POST
const listJoinRequests_route = "/api/rooms/join-requests"; // GET
const approveJoinRequest_route = "/api/rooms/approve-join-request"; // PATCH
const denyJoinRequest_route = "/api/rooms/deny-join-request"; // PATCH
const exitRoom_route = "/api/rooms/exit"; // DELETE
const listRoomMembers_route = "/api/rooms/members"; // GET
const listMyRooms_route = "/api/my"; // GET

//////// USERS ////////

/**
 * @swagger
 * /api/users/generate-api-key:
 *   post:
 *     summary: Generate API Key for a user
 *     description: Generates an API key for a user (given the wanted username (name displayed) or generate a new username if not given) and return user information (including the generated API Key).
 *     tags: [Users]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Wanted username (name displayed) (optional)
 *     responses:
 *       201:
 *         description: API key generated and stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     apiKey:
 *                       type: string
 *                     username:
 *                       type: string
 * 
 *       500:
 *         description: Internal server error
 */
app.post(generateApiKey_route, async (req, res) => {
  try {
    const username =
      req.body.username || `User-${Math.floor(Math.random() * 1000)}`; // Estrai il nome utente dal corpo della richiesta o genera casuale se non fornito

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
      message: `API key generated and stored successfully for user: ${username}`,
      data: {
        apiKey: api_key,
        username: username,
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

/**
 * @swagger
 * /api/change-username:
 *   put:
 *     summary: Change the username of a user
 *     description: Changes the username of a user (given the apiKey) and return the new username.
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newName
 *             properties:
 *               newName:
 *                 type: string
 *                 description: New username (name displayed)
 *     responses:
 *       200:
 *         description: Username changed successfully
 *       400:
 *         description: apiKey and/or newName missing
 *       401:
 *         description: Invalid API Key
 *       500:
 *         description: Internal server error
 */
app.put(changeUserName_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');
    
    const { newName } = req.body;
    
    if (!apiKey || !newName) {
      return res
        .status(400)
        .json({ message: "apiKey and newName are required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await getUserFromApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: "Invalid API Key: user not found" });
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

/**
 * @swagger
 * /api/rooms/create:
 *   post:
 *     summary: Create a new room
 *     description: Creates a new room with the authenticated user as the first member.
 *     tags: [Rooms]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: API key is missing
 *       401:
 *         description: Invalid API Key
 *       500:
 *         description: Internal server error
 */
app.post(createRoom_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const api_key = req.header('X-API-Key');
    
    if (!api_key) {
      return res.status(400).json({ message: "apiKey is required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await getUserFromApiKey(api_key);
    if (!user) {
      return res.status(401).json({ message: "Invalid API Key: user not found" });
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
        members: [user.username], // Includi i membri della stanza
      },
    }
  );
  } catch (error) {
    console.error("Error creating room:", error);
    return res.status(500).json({
      message: "An error occurred while creating the room",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/rooms/join-request:
 *   post:
 *     summary: Request to join a room
 *     description: Sends a join request to a room that requires approval from all current members.
 *     tags: [Rooms]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: ID of the room to join
 *     responses:
 *       200:
 *         description: Join request sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     apiKey:
 *                       type: string
 *                     roomId:
 *                       type: string
 *       400:
 *         description: API key and/or roomId missing
 *       401:
 *         description: Invalid API Key
 *       404:
 *         description: Room not found
 *       409:
 *         description: User already in the room
 *       500:
 *         description: Internal server error
 */
app.post(requireJoinRoom_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');
    
    const { roomId } = req.body;
    
    if (!apiKey || !roomId) {
      return res.status(400).json({ message: "apiKey and roomId are required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await getUserFromApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: "Invalid API Key: user not found" });
    }

    // Trova la stanza nel database
    const room = await roomsCollection.findOne({ roomId: roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verifica se l'utente è già nella stanza
    if (room.members.includes(apiKey)) {
      return res.status(409).json({ message: "The user is already in the room" });
    }

    // Aggiungi la richiesta di join alla collection delle join requests
    // Extract members from the room
    const members = room.members;

    // Create an approval status object for each member
    const approveStatus = members.map(memberApiKey => ({
      memberApiKey: memberApiKey,
      approved: false
    }));

    const joinRequest = {
      requestId: uuidv4(), // Genera un ID unico per la richiesta
      roomId: roomId,
      apiKey: apiKey,
      requestedAt: new Date(),
      approveStatus: approveStatus
    };
    
    // Add the join request to the collection
    const result = await joinRequestsCollection.insertOne(joinRequest);
    
    if (!result.acknowledged) {
      throw new Error("Join request creation failed");
    }
    
    return res.status(200).json({
      message: `Join request sent successfully for room ID: ${roomId}`,
      data: {
        apiKey: apiKey,
        roomId: roomId,
      },
    });
  } catch (error) {
    console.error("Error sending join request:", error);
    return res.status(500).json({
      message: "An error occurred while sending the join request",
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
