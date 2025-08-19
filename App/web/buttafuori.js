document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!username || !serverUrl || !apiKey) {
        window.location.href = "../";
    }
});
