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