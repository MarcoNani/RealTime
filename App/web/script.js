document.getElementById("start").addEventListener("click", async function (e) {
    console.log("Triggering API Key Generation");
    e.preventDefault(); // evita il refresh della pagina

    const username = document.getElementById("username").value.trim();
    const server = document.getElementById("server").value.trim().replace(/\/+$/, ""); // rimuove eventuali slash finali

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Timeout di 60 secondi

    try {
        const response = await fetch(`${server}/api/v1/users/api-key`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: username ? JSON.stringify({ username }) : "{}",
            signal: controller.signal // Collegamento del segnale di abort
        });

        clearTimeout(timeoutId); // Cancella il timeout se la risposta arriva in tempo

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Errore dal server:", errorText);
            alert("Errore nella generazione della API Key: " + response.status);
            return;
        }

        const result = await response.json();

        // gestione della risposta
        console.log("Risposta server:", result);
        alert(`Username: ${result.data.username}\nAPI Key: ${result.data.apiKey}\nPublicId: ${result.data.publicId}`);

        // Salva le informazioni dell'utente nel localStorage
        localStorage.setItem("serverUrl", server);
        localStorage.setItem("username", result.data.username);
        localStorage.setItem("apiKey", result.data.apiKey);
        localStorage.setItem("publicId", result.data.publicId);

        // Redirect to the main page
        window.location.href = "./chat_list";

    } catch (err) {
        if (err.name === "AbortError") {
            console.error("Errore: richiesta scaduta.");
            alert("La richiesta ha superato il tempo massimo di attesa (60 secondi).");
        } else {
            console.error("Errore di rete:", err);
            alert("Impossibile connettersi al server.");
        }
    }
});

