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

    socket.emit("authSuccess", { detailsToDisplay }); // Invia un messaggio di successo al client
    console.log("User authenticated:", user.username); // Logga l'autenticazione dell'utente
  }


  //// CONSTANTS ////

  const users = {}; // Oggetto contenente gli utenti connessi (chiave: apiKey, valore: socket e dettagli utente)
  const messages = []; // Array contenente i messaggi (associazione messaggio utente)

  /* 
  
      TODO: remove from cache the user when the user closes the socket
  */

  // WARNING: variabile che determina il tempo di timeout dell'autenticazione, IN MILLISECONDI
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
        // Se l'utente esiste, memorizza le informazioni dell'utente nella memoria del server
        users[user.apiKey] = {
          socket: socket,
          userDetails: user
        }; // Salva l'utente nella cache del server

        notifySuccessAuth(socket, user); // Invia un messaggio di successo al client
        clearTimeout(authTimeout); // Cancella il timeout di autenticazione
      }
    });

    /*

    // richiesta di autenticazione
    socket.emit("mustAuth"); // nel momento in cui il client si connette il server richiede al client di autenticarsi

    // timeout di autenticazione, se il client ci impiega troppo tempo ad autenticarsi termina la connessione chiudendo il socket
    const authTimeout = setTimeout(() => {
      if (!users[socket.id]) {
        socket.emit("AuthFailed", "Authentication timeout"); // ritorna al client l'errore di autenticazione

        socket.disconnect(); // disconnette il client
      }
    }, AUTENTICATION_TIMEOUT);

    // gestione richiesta di autenticazione client
    socket.on("auth", async (apiKey) => {
      //arriva la richiesta di autenticazione al server
      try {
        let user = getUserFromApiKey(apiKey); //controlla l'esistenza dell'user nel db
        if (!user) {
          throw "Inexistent user";
        }
        users[socket.id] = {
          socket: socket,
          username: user.username,
          apiKey: user.apiKey,
        }; //caches the user

        clearTimeout(authTimeout); // Clear the timeout once authenticated
        socket.emit("authSuccess");
      } catch (error) {
        socket.emit("authFailed", error);
        socket.disconnect();
      }
    });

    //--------------------------AUTH--------------------------//

    socket.on("typing", (payload) => {
      // Riceve il messaggio di scrittura
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
    });

    socket.on("disconnect", () => {
      // Quando un utente si disconnette
      console.log(`Utente disconnesso: ${user.name} (${user.id})`); // Logga la disconnessione
      delete users[socket.id]; // Rimuove l'utente dalla lista
    });

    */
  });
}