import { v4 as uuidv4 } from 'uuid';
import { usersCollection } from '../db.js'; // Importa la collection dal modulo db
import { roomsCollection } from '../db.js'; // Importa la collection dal modulo db

/**
 * Retrieves a user from the database using their API key.
 * @param {string} apiKey - The API key of the user.
 * @returns {Promise<Object|null>} - The user object or null if not found.
 */
export async function getUserFromApiKey(apiKey) {
  return await usersCollection.findOne({ apiKey });
}


/**
 * Retrieves a list of room IDs where a user is a member.
 * @param {string} apiKey - The API key of the user.
 * @returns {Promise<string[]>} - A list of room IDs.
 */
export async function getRoomIdsForUser(apiKey) {
  const rooms = await roomsCollection.find({ members: apiKey }).toArray();
  return rooms.map(room => room.roomId);
}


/**
 * Generates a unique API key that does not already exist in the database.
 * @returns {Promise<string>} - A unique API key.
 */
export async function apiKeyGenerator() {
  let apiKey;
  do {
    apiKey = generateUUID();
  } while (await usersCollection.findOne({ apiKey }));
  return apiKey;
}


/**
 * Generates a UUID without dashes.
 * @returns {string} - A UUID string without dashes.
 */
export function generateUUID() {
  return uuidv4().replace(/-/g, '');
}

