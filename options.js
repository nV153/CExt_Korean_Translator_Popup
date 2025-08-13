
// options.js
// Script for the extension's options/settings page

document.addEventListener("DOMContentLoaded", () => {
  // Get references to UI elements
  const showWordsBtn = document.getElementById("show-saved-btn");
  const exportWordsBtn = document.getElementById("export-btn");
  const container = document.getElementById("saved-words-container");

  // Show saved words when button is clicked
  showWordsBtn.addEventListener("click", () => {
    chrome.storage.local.get({ savedWords: [] }, (result) => {
      const words = result.savedWords;
      container.innerHTML = "";

      if (words.length === 0) {
        container.textContent = "No saved words found.";
        return;
      }

      // Display each saved word and its definition
      words.forEach(({ word, definitionData }) => {
        const definition = definitionData?.Endef || "No definition";
        const div = document.createElement("div");
        div.textContent = `${word} — ${definition}`;
        container.appendChild(div);
      });
    });
  });

  // Placeholder for export feature
  exportWordsBtn.addEventListener("click", () => {
    alert("Export Words feature coming soon!");
  });
});
