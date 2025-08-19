// Helper function to sanitize HTML
function sanitizeHTML(str) {
  // TODO: add support to <br> tags
  var temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Dictionary of colors
const COLORS = [
  '#FF5733', // Red
  '#33FF57', // Green
  '#3357FF', // Blue
  '#F333FF', // Pink
  '#33FFF3', // Cyan
  '#FF33A1', // Magenta
  '#A1FF33', // Lime
  '#FFA133', // Orange
  '#A133FF', // Purple
  '#33FFA1'  // Mint
];

// Helper function to obtain a color from a username
function getUsernameColor(username) {
  // sum the ASCII values of each character in the username
  var hash = 0;
  for (var i = 0; i < username.length; i++) {
    hash += username.charCodeAt(i);
  }

  // create the color
  var index = hash % COLORS.length;
  return COLORS[index];
}

// Generate message text to show
function generateTextMessage(name, time, payload) {
  messageHTMLelement = "";
  messageHTMLelement = `<strong style="color: ${getUsernameColor(name)};">${sanitizeHTML(name)}`; // metto l'user
  messageHTMLelement += ` @${time}:</strong>` // metto il time
  messageHTMLelement += ` ${sanitizeHTML(payload)}`; // metto il testo del messaggio
  return messageHTMLelement;
}

// Generate a v4 UUID
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

// Function to scroll to the bottom of the chat
function scrollToBottom() {
  if (autoScrollToggle.checked) {
    console.debug("Scrolling to bottom");
    chat.scrollTop = chat.scrollHeight;
  }
}

/**
 * @typedef {Object} Message
 * @property {string} payload   - The message content
 * @property {Date}   timestamp - When the message was created
 * @property {string} username  - The user who sent the message
 * @property {string} publicId  - The public identifier
 * @property {string} messageId - The message identifier
 */

/**
 * Renders a message in the chat div
 * @param {Message} message_obj - The message object
 */
function renderMessage(message_obj) {

  // Generate the message html element
  const messageHTML = generateTextMessage(
    message_obj.username,
    message_obj.timestamp,
    message_obj.payload
  );


  // Obtain the chat div
  const chatDiv = document.getElementById("chat");

  // Check if the message is already rendered, if yes update it, if no append it
  const existingMessage = chatDiv.querySelector(`[data-message-id="${message_obj.messageId}"]`);
  if (existingMessage) {
    existingMessage.innerHTML = messageHTML;
  } else {
    const newMessage = document.createElement("div");
    newMessage.setAttribute("data-message-id", message_obj.messageId);
    newMessage.innerHTML = messageHTML;
    chatDiv.appendChild(newMessage);
  }

  // Scroll to the bottom of the chat
  scrollToBottom();
}
