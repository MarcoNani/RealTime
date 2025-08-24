document.getElementById("start").addEventListener("click", async function (e) {
    console.log("Triggering API Key Generation");
    e.preventDefault(); // prevents page refresh

    const button = e.target;
    button.textContent = "Creating account, please wait (up to 1 minute)...";
    button.disabled = true;

    const username = document.getElementById("username").value.trim();
    const server = document.getElementById("server").value.trim().replace(/\/+$/, ""); // removes any trailing slashes

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

    try {
        const response = await fetch(`${server}/api/v1/users/api-key`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: username ? JSON.stringify({ username }) : "{}",
            signal: controller.signal // Links the abort signal
        });

        clearTimeout(timeoutId); // Clears the timeout if the response arrives in time

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server error:", errorText);
            alert("Error generating API Key: " + response.status);
            button.textContent = "Link start!";
            button.disabled = false;
            return;
        }

        const result = await response.json();

        // handle the response
        console.log("Server response:", result);
        // TODO: proper remove
        // alert(`Username: ${result.data.username}\nAPI Key: ${result.data.apiKey}\nPublicId: ${result.data.publicId}`);

        // Save user information in localStorage
        localStorage.setItem("serverUrl", server);
        localStorage.setItem("apiKey", result.data.apiKey);
        localStorage.setItem("publicId", result.data.publicId);

        // Redirect to the main page
        window.location.href = "../chat_list/";

    } catch (err) {
        if (err.name === "AbortError") {
            console.error("Error: request timed out.");
            alert("The request exceeded the maximum wait time (60 seconds).");
        } else {
            console.error("Network error:", err);
            alert("Unable to connect to the server.");
        }
        button.textContent = "Link start!";
        button.disabled = false;
    }
});

// Check if data is already present in localStorage
const storedServerUrl = localStorage.getItem("serverUrl");
const storedApiKey = localStorage.getItem("apiKey");
const storedPublicId = localStorage.getItem("publicId");

if (storedServerUrl && storedApiKey && storedPublicId) {
    // Redirect directly to the chat list
    window.location.href = "../chat_list/";
}