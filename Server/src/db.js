// db.js
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
const dbName = process.env.DB_NAME; // Ensure you have DB_NAME in your .env file
let usersCollection;

async function connect() {
    try {
        await client.connect();
        console.log("Connessione al database stabilita.");
        const db = client.db(dbName);
        usersCollection = db.collection('users'); // Initialize the users collection
        return client;
    } catch (error) {
        console.error("Errore di connessione:", error);
        throw error;
    }
}

function close() {
    client.close();
}

export { connect, close, usersCollection };