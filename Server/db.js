// db.js
const { MongoClient } = require("mongodb");
require('dotenv').config();

const client = new MongoClient(process.env.MONGO_URI);

async function connect() {
    try {
        await client.connect();
        console.log("Connessione al database stabilita.");
        return client;
    } catch (error) {
        console.error("Errore di connessione:", error);
        throw error;
    }
}

function close() {
    client.close();
}

module.exports = { connect, close };
