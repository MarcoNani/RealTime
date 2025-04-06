// db.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
const dbName = process.env.DB_NAME;

let db;
let usersCollection;
let roomsCollection;
let joinRequestsCollection;

async function connect() {
    try {
        await client.connect();
        console.log("Connessione al database stabilita.");
        db = client.db(dbName);
        usersCollection = db.collection(process.env.USERSCOLLECTION_NAME);
        roomsCollection = db.collection(process.env.ROOMSCOLLECTION_NAME);
        joinRequestsCollection = db.collection(process.env.JOINREQUESTSCOLLECTION_NAME);
        return client;
    } catch (error) {
        console.error("Errore di connessione:", error);
        throw error;
    }
}

function close() {
    client.close();
}

export {
    connect,
    close,
    usersCollection,
    roomsCollection,
    joinRequestsCollection,
};