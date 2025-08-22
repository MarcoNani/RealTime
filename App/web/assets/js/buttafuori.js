document.addEventListener("DOMContentLoaded", () => {
    const serverUrl = localStorage.getItem("serverUrl");
    const apiKey = localStorage.getItem("apiKey");

    if (!serverUrl || !apiKey) {
        window.location.href = "../onboarding/";
    }
});
