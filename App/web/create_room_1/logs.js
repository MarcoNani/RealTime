function aggiungiLog(testo) {
    const logElement = document.getElementById('logs');
    if (logElement) {
        logElement.textContent += testo + '\n';
    } else {
        console.error("Elemento con id 'logs' non trovato.");
    }
}