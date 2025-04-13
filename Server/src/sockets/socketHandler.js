// File: socketHandler.js
// Helper
import * as helpers from "../utils/helpers.js";




export function socketHandler(io) {
  //// FUNCTIONS ////
  function notifyFailAuth(socket, message) {
    // Funzione per gestire il fallimento dell'autenticazione
    console.log("Authentication failed"); // Logga l'errore
    socket.emit("authFailed", message); // Invia un messaggio di errore al client
    socket.disconnect(); // Disconnetti il client
  }

  function notifySuccessAuth(socket, user) {
    // Funzione per gestire il successo dell'autenticazione
    console.log("Authentication successful"); // Logga il successo

    const detailsToDisplay = {
      name: user.username,
      publicId: user.publicId
    }; // Crea un oggetto con i dettagli dell'utente da inviare al client

    socket.emit("authSuccess", { ...detailsToDisplay }); // Invia un messaggio di successo al client
    console.log("User authenticated:", user.username); // Logga l'autenticazione dell'utente
  }

  function sendMessageToRoom(io, senderSocketId, roomId, event, data) {
    // Trova tutti gli utenti che appartengono alla stanza
    const members = Object.entries(users).filter(([apiKey, user]) =>
      user.listRooms.includes(roomId)
    );

    // Invia il messaggio a ciascun membro
    members.forEach(([apiKey, user]) => {
      const socketId = Object.keys(sockets).find((id) => sockets[id] === apiKey);
      if (socketId && socketId !== senderSocketId) {
        // Invia il messaggio solo se il socketId è diverso da quello del mittente
        io.to(socketId).emit(event, data);
      }
    });
  }

  function authMiddleware(socket, next) {
    if (!sockets[socket.id]) {
      console.log("Unauthorized access attempt by socket:", socket.id);
      socket.emit("authRequired", "Authentication is required.");
      socket.disconnect();
    } else {
      next();
    }
  }

  function isUserMemberOfRoom(apiKey, roomId) {
    const user = users[apiKey]; // Retrieve the user associated with the apiKey
    if (!user) {
      return false; // User not found
    }
    return user.listRooms.includes(roomId); // Check if the roomId is in the user's list of rooms
  }


  //// CONSTANTS ////

  const users = {}; // Oggetto contenente gli utenti connessi (key: apiKey, value: publicId, username, listRooms)
  const sockets = {}; // Oggetto che contiene l'associazione tra socketId e apiKey
  let messages = []; // Array contenente i messaggi (associazione messaggio, stanza, utente)

  const AUTENTICATION_TIMEOUT = 60000; // attualmente 1 min

  io.on("connection", (socket) => {
    //--------------------------AUTH--------------------------//
    // quando un client si connette il primo messaggio che invia al server e "auth" in cui invia la apikey
    // il server risponde con "authSuccess" se l'apiKey è corretta e con "authFailed" se non lo è
    // il server invia anche un messaggio di errore se il client non si autentica entro 60 secondi

    // timeout di autenticazione, se il client ci impiega troppo tempo ad autenticarsi termina la connessione chiudendo il socket
    const authTimeout = setTimeout(() => {
      if (!users[socket.id]) {
        notifyFailAuth(socket, "Authentication timeout");
      }
    }, AUTENTICATION_TIMEOUT);

    socket.on("auth", async (message) => {
      const apiKey = message.apiKey; // Estrae la apiKey dal messaggio
      console.log("Received auth request with apiKey:", apiKey); // Logga la richiesta di autenticazione
      // Controllo se l'utente esiste nel db
      // Trova l'utente associato alla apiKey
      const user = await helpers.getUserFromApiKey(apiKey);


      if (!user) {
        notifyFailAuth(socket, "Inexistent user");
      } else {
        console.log("User found:", user.username); // Logga l'utente trovato

        // Save user details in the users object
        let listRooms = await helpers.getRoomIdsForUser(user.apiKey); // Estrae la lista delle stanze associate all'utente

        users[apiKey] = {
          publicId: user.publicId,
          username: user.username,
          listRooms: listRooms,
        };


        // Save the association between socketId and apiKey in the sockets object
        sockets[socket.id] = apiKey; // Associa il socketId alla apiKey

        // DEBUG
        console.log(users); // Logga gli utenti connessi
        console.log(sockets); // Logga i socketId associati alle apiKey

        console.log("User authenticated:", user.username); // Logga l'autenticazione dell'utente

        notifySuccessAuth(socket, user); // Invia un messaggio di successo al client
        clearTimeout(authTimeout); // Cancella il timeout di autenticazione
      }
    });

    //----------------------END-AUTH--------------------------//

    socket.on("disconnect", () => {

      if (sockets[socket.id]) { // If the socketId is in the cache (the user is authenticated)
        let apiKey = sockets[socket.id]; // Estrae la apiKey associata al socketId

        console.log("User disconnected (socketId apiKey):", socket.id, sockets[socket.id]); // Logga la disconnessione dell'utente

        delete sockets[socket.id]; // Rimuovi il socketId dalla cache del server
        delete users[apiKey]; // Rimuovi l'utente dalla cache del server

        messages = messages.filter((message) => message.socketId !== socket.id); // Rimuovi i messaggi associati al socketId dalla lista dei messaggi

        // DEBUG
        console.log(users); // Logga gli utenti connessi
        console.log(sockets); // Logga i socketId associati alle apiKey

      } else {
        // User not authenticated
        console.log("User disconnected:", socket.id); // Logga la disconnessione dell'utente
      }
    });


    socket.on("messageId", (message) => {
      // Il client invia una richiesta per ottenere l'id del messaggio da utilizzare inviando una sendId
      // Il server genera un id unico per il messaggio e lo restituisce al client

      // AUTENTICAZIONE
      // Controlla se l'utente è autenticato
      // Se l'utente non è autenticato, invia un messaggio di errore e disconnette il socket
      // Se l'utente è autenticato, inizia la logica di gestione del routing del messaggio

      authMiddleware(socket, () => {
        // Check if the user wnat to obtain a messageId for a roomId where he is a member
        const sendId = message.sendId; // Extract sendId from the message
        const roomId = message.roomId; // Extract roomId from the message
        console.log("Received messageId request with sendId:", sendId);
        console.log("Received messageId request with roomId:", roomId);

        if (isUserMemberOfRoom(sockets[socket.id], roomId)) {
          console.log("User is a member of the room:", message.roomId); // Logga che l'utente è membro della stanza

          console.log("Received messageId request and auth wint good"); // Logga la richiesta di id messaggio



          // Generate a messageId for the message
          const messageId = helpers.generateUUID(); // Genera un id unico per il messaggio
          console.log("Generated messageId:", messageId); // Logga l'id del messaggio generato

          // Save the messageId in the messages array
          const timestamp = new Date();
          timestamp.setSeconds(0, 0); // Set seconds and milliseconds to 0 for minute precision
          messages.push({ messageId: messageId, socketId: socket.id, roomId: roomId, timeWindow: timestamp });

          console.log(messages); // Logga i messaggi salvati

          // Send the messageId back to the client
          socket.emit("messageId", { messageId, sendId, roomId }); // Invia l'id del messaggio al client
          console.log("Sent messageId to client:", messageId); // Logga l'id del messaggio inviato al client

        } else {
          console.log("User is not a member of the room:", message.roomId); // Logga che l'utente non è membro della stanza
          socket.emit("ack", { sendId: sendId, legal: false, message: "You are not a member of the room you want to write on" }); // Invia un messaggio di errore al client
        }





      });
    });


    socket.on("typing", (message) => {
      // RICEVE: sendId, messaggeId, roomId, payload
      // Controlla se messageId appartiene al mittente, è associato alla stanza e il mittente è un membro della stanza
      // Costruisce l'oggetto del messaggio da recapitare
      // Invio il messaggio a tutti i membri della stanza

      // Ritorno al mittente un messaggio di ack con sendId, legal: true, message: "Message sent"

      // Se invece ci sono problemi con l'invio del messaggio, ritorno al mittente un messaggio di ack con sendId, legal: false, message: "motivo del rifiuto"

      authMiddleware(socket, () => {
        // L'utente è autenticato, procedi con la logica del messaggio

        const sendId = message.sendId;
        const roomId = message.roomId;
        const messageId = message.messageId;
        const payload = message.payload;
        console.debug("Received typing message with sendId:", sendId);
        console.debug("Received typing message with roomId:", roomId);
        console.debug("Received typing message with messageId:", messageId);
        console.debug("Received typing message with payload:", payload);

        if (isUserMemberOfRoom(sockets[socket.id], roomId)) {
          console.debug("User is a member of the room:", roomId);

          // Trova il messaggio con messageId, socketId e roomId uguali a quelli richiesti
          const messageObj = messages.find((msg) => msg.messageId === messageId && msg.socketId === socket.id && msg.roomId === roomId);

          if (messageObj) {
            console.debug("Message found:", messageObj);

            // Invia un messaggio di ack al mittente
            socket.emit("ack", { sendId: sendId });
            console.debug("Sent ack to sender:", sendId);

            // Invia il messaggio a tutti i membri della stanza
            sendMessageToRoom(io, socket.id, roomId, "typing", {
              messageId: messageId,
              roomId: roomId,
              payload: payload,
              timestamp: new Date().toISOString(),
              publicId: users[sockets[socket.id]].publicId,
            });



            console.log("Sent typing message to room:", roomId); // Logga l'invio del messaggio alla stanza



          } else {
            console.debug("Message not found or not authorized");
            socket.emit("ack", { sendId: sendId, legal: false, message: "Can't edit this message, create a new one" });
          }

        }
        else {
          console.debug("User is not a member of the room:", roomId);
          socket.emit("ack", { sendId: sendId, legal: false, message: "You are not a member of the room you want to write on" });
        }



      });

    });


    socket.on("finish", (message) => {
      // Molto simile a typing ma è la versione finale del messaggio quindi lo rimuove dallla lista dei messaggi del server

      authMiddleware(socket, () => {
        // L'utente è autenticato, procedi con la logica del messaggio

        const sendId = message.sendId;
        const roomId = message.roomId;
        const messageId = message.messageId;
        const payload = message.payload;
        console.debug("Received typing message with sendId:", sendId);
        console.debug("Received typing message with roomId:", roomId);
        console.debug("Received typing message with messageId:", messageId);
        console.debug("Received typing message with payload:", payload);

        if (isUserMemberOfRoom(sockets[socket.id], roomId)) {
          console.debug("User is a member of the room:", roomId);

          // Trova il messaggio con messageId, socketId e roomId uguali a quelli richiesti
          const messageObj = messages.find((msg) => msg.messageId === messageId && msg.socketId === socket.id && msg.roomId === roomId);

          if (messageObj) {
            console.debug("Message found:", messageObj);

            // Invia un messaggio di ack al mittente
            socket.emit("ack", { sendId: sendId });
            console.debug("Sent ack to sender:", sendId);

            // Invia il messaggio a tutti i membri della stanza
            sendMessageToRoom(io, socket.id, roomId, "finish", {
              messageId: messageId,
              roomId: roomId,
              payload: payload,
              timestamp: new Date().toISOString(),
              publicId: users[sockets[socket.id]].publicId,
            });

            // Rimuovi il messaggio dalla lista dei messaggi del server per impedire che venga modificato successivamente
            messages = messages.filter((msg) => msg.messageId !== messageId);
            console.debug("Removed message from server messages list:", messageObj);



            console.log("Sent finish message to room:", roomId); // Logga l'invio del messaggio alla stanza



          } else {
            console.debug("Message not found or not authorized");
            socket.emit("ack", { sendId: sendId, legal: false, message: "Can't edit this message, create a new one" });
          }

        }
        else {
          console.debug("User is not a member of the room:", roomId);
          socket.emit("ack", { sendId: sendId, legal: false, message: "You are not a member of the room you want to write on" });
        }



      });


    });



    
  });
}