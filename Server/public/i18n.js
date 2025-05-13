// File di configurazione per l'internazionalizzazione

// Oggetto che conterrà le traduzioni caricate
let translations = {};

// Lingua di default
let currentLanguage = 'it';
const supportedLanguages = ['it', 'en'];

// Funzione per rilevare la lingua del browser
function detectBrowserLanguage() {
    // Usa il navigator.language o il primo navigator.languages se disponibile
    let browserLang = (navigator.language || navigator.userLanguage || 'it').split('-')[0];
    
    // Verifica se la lingua è supportata, altrimenti usa il default
    return supportedLanguages.includes(browserLang) ? browserLang : 'it';
}

// Carica un file di lingua
async function loadLanguageFile(lang) {
    try {
        const response = await fetch(`/lang/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Errore nel caricamento del file di lingua ${lang}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Impossibile caricare la lingua ${lang}:`, error);
        return {};
    }
}

// Inizializza la localizzazione al caricamento del documento
document.addEventListener('DOMContentLoaded', async () => {
    // Rileva la lingua del browser
    currentLanguage = detectBrowserLanguage();
    
    // Carica il file di lingua
    translations[currentLanguage] = await loadLanguageFile(currentLanguage);
    
    // Imposta l'attributo lang sull'elemento html
    document.documentElement.lang = currentLanguage;
    
    // Applica le traduzioni
    applyTranslations();
});

// Funzione che applica le traduzioni in base alla lingua selezionata
function applyTranslations() {
    // Se non ci sono traduzioni disponibili, esci
    if (!translations[currentLanguage]) return;
    
    // Traduce gli elementi con attributo data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });

    // Traduce i placeholder
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[currentLanguage][key]) {
            element.setAttribute('placeholder', translations[currentLanguage][key]);
        }
    });
}

// Espone funzione per ottenere traduzioni dinamiche (utile per messaggi generati dinamicamente)
function getTranslation(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || key;
}
