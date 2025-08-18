// Helper function to sanitize HTML
function sanitizeHTML(str) {
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
function generateTextMessage(message_obj) {
    messageHTMLelement = "";
    messageHTMLelement = `<strong style="color: ${getUsernameColor(message_obj.name)};">${sanitizeHTML(message_obj.name)}`; // metto l'user
    messageHTMLelement += ` @${message_obj.time}:</strong>` // metto il time
    messageHTMLelement += ` ${sanitizeHTML(message_obj.payload)}`; // metto il testo del messaggio
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