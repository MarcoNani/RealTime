// Helper function to sanitize HTML
function sanitizeHTML(str) {
    // TODO: add support for <br> tags
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
    // Sum the ASCII values of each character in the username
    var hash = 0;
    for (var i = 0; i < username.length; i++) {
        hash += username.charCodeAt(i);
    }

    // Create the color
    var index = hash % COLORS.length;
    return COLORS[index];
}

function getColors(username) {
    const usernameColor = getUsernameColor(username);

    // Convert hex to RGB
    const r = parseInt(usernameColor.slice(1, 3), 16);
    const g = parseInt(usernameColor.slice(3, 5), 16);
    const b = parseInt(usernameColor.slice(5, 7), 16);

    // Convert RGB to hex
    const rgbToHex = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    // TODO: add comments to explain what each number does
    const timeColor = rgbToHex(
        Math.min(255, r * 0.07 + 130),
        Math.min(255, g * 0.07 + 130),
        Math.min(255, b * 0.07 + 130)
    );

    const msgTextColor = rgbToHex(
        Math.max(0, r * 0.1),
        Math.max(0, g * 0.1),
        Math.max(0, b * 0.1)
    );

    const bgColor = rgbToHex(
        Math.min(255, r * 0.2 + 204),
        Math.min(255, g * 0.2 + 204),
        Math.min(255, b * 0.2 + 204)
    );

    return {
        nameColor: usernameColor,
        timeColor: timeColor,
        msgTextColor: msgTextColor,
        bgColor: bgColor
    };
}


// Generate message text to show
function generateMyMessage(username, timestamp, payload, messageId, typing, messageId) {
    // right

    // Create a temporary container
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper wrapper-right";


    // TODO: Calculate colors based on the username
    const colors = getColors(username);

    const nameColor = colors.nameColor;
    const timeColor = colors.timeColor;
    const msgTextColor = colors.msgTextColor;
    const bgColor = colors.bgColor;

    // Using innerHTML for the colors, i should be safe because i calculated them (let's hope so)
    wrapper.innerHTML =
        `
          <div class="message-right" style="background-color: ${bgColor}; color: ${msgTextColor};"></div>
          <div class="meta">
            <div style="color: ${nameColor};"></div>
            <div style="color: ${timeColor};"></div>
          </div>
        `;

    // Select the "slot" elements
    const messageDiv = wrapper.querySelector(".message-right");
    const userDiv = wrapper.querySelector(".meta div:nth-child(1)");
    const timeDiv = wrapper.querySelector(".meta div:nth-child(2)");

    // Transform the timestamp into a readable format
    let displayTime = new Date(timestamp).toLocaleTimeString(); // TODO: replace with better formatting

    // TODO: add the typing effect
    if (typing) {
        displayTime += '~'
    }

    // Insert dynamic values safely
    messageDiv.textContent = payload;
    userDiv.textContent = username;
    timeDiv.textContent = displayTime;

    // Set the message ID
    wrapper.setAttribute("data-message-id", messageId);

    return wrapper;
}

// TODO: make one function for both
function generateOthersMessage(username, timestamp, payload, messageId, typing, messageId) {
    // left

    // Create a temporary container
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper wrapper-left";

    // TODO: Calculate colors based on the username
    const colors = getColors(username);

    const nameColor = colors.nameColor;
    const timeColor = colors.timeColor;
    const msgTextColor = colors.msgTextColor;
    const bgColor = colors.bgColor;

    // Using innerHTML for the colors, i should be safe because i calculated them (let's hope so)
    wrapper.innerHTML =
        `
          <div class="message-left" style="background-color: ${bgColor}; color: ${msgTextColor};"></div>
          <div class="meta">
            <div style="color: ${nameColor};"></div>
            <div style="color: ${timeColor};"></div>
          </div>
        `;

    // Select the "slot" elements
    const messageDiv = wrapper.querySelector(".message-left");
    const userDiv = wrapper.querySelector(".meta div:nth-child(1)");
    const timeDiv = wrapper.querySelector(".meta div:nth-child(2)");

    // Transform the timestamp into a readable format
    let displayTime = new Date(timestamp).toLocaleTimeString(); // TODO: replace with better formatting

    // TODO: add the typing effect
    if (typing) {
        displayTime += '~'
    }

    // Insert dynamic values safely
    messageDiv.textContent = payload;
    userDiv.textContent = username;
    timeDiv.textContent = displayTime;

    // Set the message ID
    wrapper.setAttribute("data-message-id", messageId);

    return wrapper;
}

// Generate a v4 UUID
function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

// Function to scroll to the bottom of the chat
function scrollToBottom() {
    const autoScrollToggle = document.getElementById("autoScrollToggle");

    if (!autoScrollToggle || autoScrollToggle.checked) {
        // obtain scroll position of the entire document
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        console.log("Scroll position:", scrollPosition);

        // Scroll to the bottom of the document
        window.scrollTo(0, document.body.scrollHeight);
    }
}

/**
 * @typedef {Object} Message
 * @property {string} payload   - The message content
 * @property {Date}   timestamp - When the message was created
 * @property {string} username  - The user who sent the message
 * @property {string} publicId  - The public identifier
 * @property {string} messageId - The message identifier
 * @property {boolean} typing    - Whether the user is typing
 * @property {boolean} mine      - Whether the message is from the current user
 */

/**
 * Renders a message in the chat div
 * @param {Message} message_obj - The message object
 */
async function renderMessage(message_obj, roomId, encrypted=true) {
    const { payload, timestamp, username, publicId, messageId, typing, mine } = message_obj;

    let decryptedPayload;

    if (encrypted) {
        console.log("Decrypting message payload:", payload);
        decryptedPayload = await decryptPayload(payload, roomId);
    } else {
        decryptedPayload = payload;
    }


    // Obtain the chat div
    const chatDiv = document.getElementById("chat");
    // Check if the message is already rendered, if yes update it, if no append it
    const existingMessage = chatDiv.querySelector(`[data-message-id="${message_obj.messageId}"]`);

    let newMessageElement;

    if (mine) {
        // Generate the message element for the current user's message
        newMessageElement = generateMyMessage(username, timestamp, decryptedPayload, messageId, typing, messageId);
    } else {
        // Generate the message element for another user's message
        newMessageElement = generateOthersMessage(username, timestamp, decryptedPayload, messageId, typing, messageId);
    }

    if (existingMessage) {
        // Update the existing message
        existingMessage.replaceWith(newMessageElement);
    } else {
        // Append the new message
        chatDiv.appendChild(newMessageElement);
    }

    scrollToBottom();
}



