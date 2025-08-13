
// popup.js
// Script for the extension popup window

// Get 'word' parameter from popup URL
const params = new URLSearchParams(window.location.search);
const word = params.get("word") || "";

// Display the word in the popup
document.getElementById("word").textContent = word;
