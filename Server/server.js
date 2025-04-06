import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { connect, close } from "./src/db.js";
import { config } from "dotenv";
// Swagger
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";


// Helper
import * as helpers from "./src/utils/helpers.js";


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
const generateApiKey_route = "/api/v1/users/api-key"; // POST
const changeUserName_route = "/api/v1/users/change-username"; // PATCH

// rooms
const createRoom_route = "/api/v1/rooms"; // POST
const listMyRooms_route = "/api/v1/rooms"; // GET
const requireJoinRoom_route = "/api/v1/rooms/:roomId/join-requests"; // POST
const listJoinRequests_route = "/api/v1/rooms/:roomId/join-requests"; // GET
const voteJoinRequest_route = "/api/v1/rooms/:roomId/join-requests/:requestId/votes"; // PATCH
const exitRoom_route = "/api/v1/rooms/:roomId/members"; // DELETE
const listRoomDetails_route = "/api/v1/rooms/:roomId"; // GET

//////// USERS ////////

/**
 * @swagger
 * /api/v1/users/api-key:
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
 *                     publicId:
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

    const apiKey = await helpers.apiKeyGenerator(); // Genera la chiave API

    const publicId = await helpers.apiKeyGenerator(); // Genera un ID pubblico unico

    const result = await usersCollection.insertOne({
      apiKey: apiKey,
      publicId: publicId,
      username: username,
    }); // Inserisce i dati nel database

    if (!result.acknowledged) {
      throw new Error("Document insertion failed");
    }

    console.log("Inserted ID:", result.insertedId);

    return res.status(201).json({
      message: `API key generated and stored successfully for user: ${username}`,
      data: {
        apiKey: apiKey,
        publicId: publicId,
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
 * /api/v1/users/change-username:
 *   patch:
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
app.patch(changeUserName_route, async (req, res) => {
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
    const user = await helpers.getUserFromApiKey(apiKey);
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
 * /api/v1/rooms:
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
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      return res.status(400).json({ message: "apiKey is required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await helpers.getUserFromApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: "Invalid API Key: user not found" });
    }

    // Genera un nuovo ID per la stanza
    const roomId = helpers.generateUUID(); // Genera un ID unico per la stanza

    // Crea la stanza nel database
    const result = await roomsCollection.insertOne({
      roomId: roomId,
      members: [apiKey], // Aggiungi l'utente come membro della stanza
      createdAt: new Date(),
    });

    // Verifica se l'inserimento è andato a buon fine
    if (!result.acknowledged) {
      throw new Error("Room creation failed");
    }
    console.log("Inserted Room ID:", result.insertedId);

    return res.status(201).json({
      message: `Room created successfully`,
      data: {
        roomId: roomId,
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
 * /api/v1/rooms:
 *   get:
 *     summary: List rooms where the user is a member
 *     description: Returns all rooms where the user with the provided API key is a member, along with member details if some member detail is not present in the db it will be setted as null.
 *     tags:
 *       - Rooms
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of rooms successfully retrieved
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
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           roomId:
 *                             type: string
 *                           members:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 publicId:
 *                                   type: string
 *                                   nullable: true
 *                                 username:
 *                                   type: string
 *                                   nullable: true
 *       400:
 *         description: API key missing
 *       500:
 *         description: Internal server error
 */
app.get(listMyRooms_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      return res.status(400).json({ message: "apiKey is required" });
    }

    // Trova le stanze in cui l'utente è membro
    const rooms = await roomsCollection.find({ members: apiKey }).toArray();

    // Map le stanze per sostituire l'apiKey con il nome utente e aggiungere il publicId
    // Extract all unique member API keys from all rooms
    const allMemberApiKeys = [...new Set(rooms.flatMap(room => room.members))];

    // Fetch all user details in a single query
    const members = await usersCollection.find({ apiKey: { $in: allMemberApiKeys } }).toArray();

    // Create a lookup map for faster access
    const memberMap = {};
    members.forEach(member => {
      memberMap[member.apiKey] = {
        publicId: member.publicId,
        username: member.username
      };
    });

    // Map rooms with user details from our lookup
    const roomsWithUsernames = rooms.map(room => {
      return {
        roomId: room.roomId,
        members: room.members.map(memberApiKey => {
          const member = memberMap[memberApiKey] || {};
          return {
            publicId: member.publicId || null,
            username: member.username || null
          };
        })
      };
    });


    // Ritorna la lista delle stanze e i membri
    return res.status(200).json({
      message: `Found ${roomsWithUsernames.length} rooms for the autenticated user`,
      data: {
        rooms: roomsWithUsernames
      }
    });
  } catch (error) {
    console.error("Error listing rooms:", error);
    return res.status(500).json({
      message: "An error occurred while listing rooms",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/rooms/{roomId}/join-requests:
 *   post:
 *     summary: Request to join a room
 *     description: Sends a join request to a room that requires approval from all current members.
 *     tags: [Rooms]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room to join
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
 *                     requestId:
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

    const { roomId } = req.params;

    if (!apiKey || !roomId) {
      return res.status(400).json({ message: "apiKey and roomId are required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await helpers.getUserFromApiKey(apiKey);
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
    const approveStatusForMembers = members.map(memberApiKey => ({
      memberApiKey: memberApiKey,
      approved: null // null means not yet voted
    }));

    const joinRequest = {
      requestId: helpers.generateUUID(), // Genera un ID unico per la richiesta
      roomId: roomId,
      apiKey: apiKey,
      status: "pending",
      requestedAt: new Date(),
      memberDecisions: approveStatusForMembers
    };

    // Add the join request to the collection
    const result = await joinRequestsCollection.insertOne(joinRequest);

    if (!result.acknowledged) {
      throw new Error("Join request creation failed");
    }

    return res.status(200).json({
      message: `Join request sent successfully for room ID: ${roomId}`,
      data: {
        requestId: joinRequest.requestId,
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

/**
 * @swagger
 * /api/v1/rooms/{roomId}/join-requests:
 *   get:
 *     summary: List all join requests for a room
 *     description: Returns a list of all join requests for a specific room, including their approval status and member decisions. Only members of the room can view join requests.
 *     tags:
 *       - Rooms
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room
 *     responses:
 *       200:
 *         description: Join requests retrieved successfully
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
 *                     joinRequests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           requestId:
 *                             type: string
 *                           roomId:
 *                             type: string
 *                           requestorUsername:
 *                             type: string
 *                           requestedAt:
 *                             type: string
 *                             format: date-time
 *                           approveStatus:
 *                             type: string
 *                             enum: [pending, approved, denied]
 *                           memberDecisions:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 memberApiKey:
 *                                   type: string
 *                                 approved:
 *                                   type: boolean
 *       400:
 *         description: API key and/or roomId missing
 *       401:
 *         description: Invalid API Key
 *       403:
 *         description: Unauthorized access (user not a member of the room)
 *       404:
 *         description: Room not found
 *       500:
 *         description: Internal server error
 */
app.get(listJoinRequests_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');

    const { roomId } = req.params;

    if (!apiKey || !roomId) {
      return res.status(400).json({ message: "apiKey and roomId are required" });
    }

    // Trova l'utente associato alla apiKey
    const user = await helpers.getUserFromApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: "Invalid API Key: user not found" });
    }

    // Trova la stanza nel database
    const room = await roomsCollection.findOne({ roomId: roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verifica se l'utente è un membro della stanza
    if (!room.members.includes(apiKey)) {
      return res.status(403).json({ message: "User is not a member of the room" });
    }

    // Find join requests for the room
    const joinRequests = await joinRequestsCollection.find({ roomId: roomId }).toArray();

    // If there are no join requests, return empty array
    if (joinRequests.length === 0) {
      return res.status(200).json({
        message: `No join requests found for room ${roomId}`,
        data: {
          roomId: roomId,
          joinRequests: []
        }
      });
    }

    // Get usernames for requestors
    const requestorApiKeys = joinRequests.map(request => request.apiKey);
    const requestors = await usersCollection.find({ apiKey: { $in: requestorApiKeys } }).toArray();
    const apiKeyToUsername = {};
    requestors.forEach(user => {
      apiKeyToUsername[user.apiKey] = user.username;
    });

    // Enhance join requests with requestor usernames
    const enhancedRequests = joinRequests.map(request => ({
      requestId: request.requestId,
      roomId: request.roomId,
      requestorUsername: apiKeyToUsername[request.apiKey] || 'Unknown User',
      requestedAt: request.requestedAt,
      approveStatus: request.status,
      memberDecisions: request.memberDecisions
    }));

    return res.status(200).json({
      message: `Found ${enhancedRequests.length} join requests for room ${roomId}`,
      data: {
        roomId: roomId,
        joinRequests: enhancedRequests
      }
    });
  } catch (error) {
    console.error("Error listing join requests:", error);
    return res.status(500).json({
      message: "An error occurred while listing join requests",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/rooms/{roomId}/join-requests/{requestId}/votes:
 *   patch:
 *     summary: Vote on a join request for a room.
 *     description: |
 *       Allows a user to approve or deny a join request for a specific room passing the vote in the body of the request (true = approve, false = deny). \
 *       If all members approve, the requesting user is automatically added to the room. \
 *       If the request is denied, the requesting user will not be added to the room.
 *     tags:
 *       - Rooms
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the room associated with the join request.
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the join request being voted on.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vote:
 *                 type: boolean
 *                 description: The vote for the join request (true for approval, false for denial).
 *             required:
 *               - vote
 *     responses:
 *       200:
 *         description: Successfully processed the vote.
 *       400:
 *         description: API key and/or roomId and/or requestId missing and/or invalid vote value.
 *       401:
 *         description: Invalid API key.
 *       403:
 *         description: User is not allowed to vote on this join request.
 *       404:
 *         description: Join request not found.
 *       409:
 *         description: User has already voted on this join request.
 *       500:
 *         description: Internal server error.
 */
app.patch(voteJoinRequest_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');

    const { roomId, requestId } = req.params;

    // read the body to get the vote (true or false)
    const { vote } = req.body;

    if (!apiKey || !roomId || !requestId) {
      return res.status(400).json({ message: "apiKey, roomId, and requestId are required" });
    }

    // validate the vote
    if (vote !== true && vote !== false) {
      return res.status(400).json({ message: "vote must be true or false" });
    }


    // Trova l'utente associato alla apiKey
    const user = await helpers.getUserFromApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: "Invalid API Key: user not found" });
    }

    // Trova la richiesta di join nel database
    const joinRequest = await joinRequestsCollection.findOne({ requestId: requestId, roomId: roomId });
    if (!joinRequest) {
      return res.status(404).json({ message: "Join request not found" });
    }

    // Check if the request is still in pending state
    if (joinRequest.status !== "pending") {
      return res.status(409).json({ message: "Join request is no longer pending so you can no more vote for this join request" });
    }

    // Check if the user is allowed to vote and if already voted
    const approveStatusIndex = joinRequest.memberDecisions.findIndex(status => status.memberApiKey === apiKey);
    if (approveStatusIndex === -1) {
      return res.status(403).json({ message: "User is not allowed to vote on this request" });
    }
    if (joinRequest.memberDecisions[approveStatusIndex].approved !== null) {
      return res.status(409).json({ message: "User has already voted on this join request" });
    }



    if (vote === true) {
      // Update the database with the approval
      const result = await joinRequestsCollection.updateOne(
        { requestId: requestId, "memberDecisions.memberApiKey": apiKey },
        { $set: { "memberDecisions.$.approved": true } }
      );
      if (!result.acknowledged) {
        throw new Error("Join request approval failed");
      }

      // Update the joinRequest in memory
      joinRequest.memberDecisions[approveStatusIndex].approved = true;

      console.log(`User ${user.username} approved join request ${requestId}`);

      // Se tutti gli utenti hanno approvato la richiesta aggiungi l'utente alla stanza
      const allApproved = joinRequest.memberDecisions.every(status => status.approved);

      if (allApproved) {
        // Update the join request status to approved
        const updateResult = await joinRequestsCollection.updateOne(
          { requestId: requestId },
          { $set: { status: "approved" } }
        );
        if (!updateResult.acknowledged) {
          throw new Error("Failed to update join request status to approved");
        }

        // Aggiungi l'utente alla stanza
        const roomUpdateResult = await roomsCollection.updateOne(
          { roomId: roomId },
          { $addToSet: { members: joinRequest.apiKey } }
        );
        if (!roomUpdateResult.acknowledged) {
          throw new Error("Failed to add user to room");
        }
        return res.status(200).json({
          message: `Join request approved and user added to room ${roomId}`,
        });
      }

      return res.status(200).json({
        message: `Join request approved, waiting for other members to approve`,
      });
    } else {
      // Update the database with the denyal
      const result = await joinRequestsCollection.updateOne(
        { requestId: requestId, "memberDecisions.memberApiKey": apiKey },
        { $set: { "memberDecisions.$.approved": false } }
      );
      if (!result.acknowledged) {
        throw new Error("Join request denyal failed");
      }

      console.log(`User ${user.username} denyed join request ${requestId}`);

      // Update the reuest status to denied
      const updateResult = await joinRequestsCollection.updateOne(
        { requestId: requestId },
        { $set: { status: "denied" } }
      );
      if (!updateResult.acknowledged) {
        throw new Error("Failed to update join request status to denied");
      }

      return res.status(200).json({
        message: `Join request denied`,
      });
    }
  } catch (error) {
    console.error("Error approving join request:", error);
    return res.status(500).json({
      message: "An error occurred while approving the join request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/rooms/{roomId}/members:
 *   delete:
 *     summary: Exit a room (remove the authenticated user from room members)
 *     description: Allows a user to leave a room they are a member of.
 *     tags:
 *       - Rooms
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room to exit
 *     responses:
 *       200:
 *         description: User successfully removed from room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: API key and/or roomId missing
 *       404:
 *         description: Room not found or user not in room
 *       500:
 *         description: Internal server error
 */
app.delete(exitRoom_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');

    const { roomId } = req.params;

    if (!apiKey || !roomId) {
      return res.status(400).json({ message: "apiKey and roomId are required" });
    }

    const room = await roomsCollection.findOne({ roomId: roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verifica se l'utente è un membro della stanza
    if (room.members.includes(apiKey)) {
      // L'utente è nella stanza, quindi lo rimuoviamo
      const result = await roomsCollection.updateOne(
        { roomId: roomId },
        { $pull: { members: apiKey } }
      );

      if (!result.acknowledged) {
        throw new Error("Failed to remove user from room");
      }

      // Membro rimosso dalla stanza
      // Check if the room has only one member (the current user who's leaving)
      if (room.members.length === 1) {
        // Room will have no more members after the user leaves, delete it
        const deleteResult = await roomsCollection.deleteOne({ roomId: roomId });
        if (!deleteResult.acknowledged) {
          throw new Error("Failed to delete empty room");
        }
        console.log(`Room ${roomId} deleted after last member left`);
        return res.status(200).json({
          message: `User successfully removed from room ${roomId} and room deleted because it was now empty`,
        });
      }

      return res.status(200).json({
        message: `User successfully removed from room ${roomId}`,
      });
    } else {
      return res.status(404).json({ message: "You are not in this room" });
    }
  } catch (error) {
    console.error("Error exiting room:", error);
    return res.status(500).json({
      message: "An error occurred while exiting the room",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/rooms/{roomId}:
 *   get:
 *     summary: Obtain details of a room
 *     description: Obtain details of a room including the list of members of a room (given the roomId).
 *     tags:
 *       - Rooms
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room to list members
 *     responses:
 *       200:
 *         description: Successfully retrieved room members
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
 *                         type: object
 *                         properties:
 *                           publicId:
 *                             type: string
 *                           username:
 *                             type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: API key and/or roomId missing
 *       404:
 *         description: Room not found or user not in room
 *       500:
 *         description: Internal server error
 */
app.get(listRoomDetails_route, async (req, res) => {
  try {
    // Cerca l'API key nell'header 'X-API-Key'
    const apiKey = req.header('X-API-Key');

    const { roomId } = req.params;

    if (!apiKey || !roomId) {
      return res.status(400).json({ message: "apiKey and roomId are required" });
    }

    // Find the room and check if user is a member in a single query
    const room = await roomsCollection.findOne({
      roomId: roomId,
      members: apiKey
    });

    // If no room is found, either the room doesn't exist or user isn't a member but for the user is allways not found
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // the user is a member of the room, so we can proceed to get the members

    // Get usernames for all members
    const memberApiKeys = room.members;

    const members = await usersCollection.find({ apiKey: { $in: memberApiKeys } }).toArray();

    const listOfMembers = members.map(member => ({
      publicId: member.publicId,
      username: member.username
    }));

    // Return the list of members and the roomId
    return res.status(200).json({
      message: `Found ${listOfMembers.length} members in room ${roomId}`,
      data: {
        roomId: roomId,
        members: listOfMembers,
        createdAt: room.createdAt
      }

    });

  } catch (error) {
    console.error("Error listing room members:", error);
    return res.status(500).json({
      message: "An error occurred while listing room members",
      error: error.message,
    });
  }
});





server.listen(port_server, () => {
  console.log(`Server in ascolto su http://localhost:${port_server}`);
});
