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
      // RICEVE: messaggeId, roomId, sendId, payload
      // Controlla se messageId appartiene al mittente
      // Controlla se il mittente appartiene alla roomId specificata nel messaggio
      // Costruisce l'oggetto del messaggio da recapitare
      // Invio il messaggio a tutti i membri della stanza

      // --- LISTA DEI MESSAGGI ---
      // Oggetto che contiene i messaggi inviati dagli utenti
      // 


      // Riceve il messaggio di scrittura
      // Controllo se l'utente è autenticato
      // Se l'utente non è autenticato, invia un messaggio di errore e disconnette il socket
      // Se l'utente è autenticato, inizia la logica di gestione del routing del messaggio
      // ROUTING DEL MESSAGGIO
      // 




      /*

      if (!users[socket.id]) {
        socket.emit("authRequired");
        display("Hacker");
        socket.disconnect();
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
          msg_id: generateUUID(),
        }; // realizzo l'oggetto contenente i dettagli sul messaggio
        display(message_obj); // Invia a tutti i client l'oggetto messaggio
        messages.push({ id: socket.id, msg_id: message_obj.msg_id }); // Aggiungo l'oggetto messaggio alla lista dei messaggi
      }

      */

    });

  });
}