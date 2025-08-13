// options.js
// Script for the extension's options/settings page

document.addEventListener("DOMContentLoaded", () => {
  const showWordsBtn = document.getElementById("show-saved-btn");
  const exportWordsBtn = document.getElementById("export-btn");
  const container = document.getElementById("saved-words-container");

  // Create filter box for display and save settings
  const filterDiv = document.createElement("div");
  filterDiv.id = "display-attributes";
  filterDiv.className = "options-section";
  filterDiv.innerHTML = `
  <h3>Word Attributes</h3>
  <p>Control which attributes are <strong>shown</strong> and <strong>saved</strong>:</p>
  <label><input type="checkbox" id="show-importance"> Importance</label>
  <label><input type="checkbox" id="show-hanja" style="margin-left:10px;"> Hanja</label>
  <label><input type="checkbox" id="show-hanjaMeanings" style="margin-left:10px;"> Hanja Meanings</label>
  <label><input type="checkbox" id="show-pronunciation" style="margin-left:10px;"> Pronunciation</label>
  <label><input type="checkbox" id="show-partOfSpeech" style="margin-left:10px;"> Part of Speech</label>
  <label><input type="checkbox" id="show-meanings" style="margin-left:10px;"> Meanings</label>
  `;
  container.parentElement.insertBefore(filterDiv, container);

  // Default settings if none saved yet
  const defaultSettings = {
    importance: true,
    hanja: true,
    hanjaMeanings: false,
    pronunciation: true,
    partOfSpeech: true,
    meanings: true
  };

  // Load saved settings
  chrome.storage.local.get({
    saveSettings: defaultSettings
  }, (result) => {
    const settings = result.saveSettings;
  document.getElementById("show-importance").checked = settings.importance;
  document.getElementById("show-hanja").checked = settings.hanja;
  document.getElementById("show-hanjaMeanings").checked = settings.hanjaMeanings;
  document.getElementById("show-pronunciation").checked = settings.pronunciation;
  document.getElementById("show-partOfSpeech").checked = settings.partOfSpeech;
  document.getElementById("show-meanings").checked = settings.meanings;
  });

  // Save settings when checkboxes change
  [
    "show-importance",
    "show-hanja",
    "show-hanjaMeanings",
    "show-pronunciation",
    "show-partOfSpeech",
    "show-meanings"
  ].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      const newSettings = {
        importance: document.getElementById("show-importance").checked,
        hanja: document.getElementById("show-hanja").checked,
        hanjaMeanings: document.getElementById("show-hanjaMeanings").checked,
        pronunciation: document.getElementById("show-pronunciation").checked,
        partOfSpeech: document.getElementById("show-partOfSpeech").checked,
        meanings: document.getElementById("show-meanings").checked
      };
      chrome.storage.local.set({ saveSettings: newSettings });
    });
  });

  // Show saved words
  showWordsBtn.addEventListener("click", () => {
    chrome.storage.local.get({ savedWords: [], saveSettings: defaultSettings }, (result) => {
      const words = result.savedWords;
      const settings = result.saveSettings;
      container.innerHTML = "";

      if (words.length === 0) {
        container.textContent = "No saved words found.";
        return;
      }

      let currentIndex = 0;

      function renderWord(index) {
        const wordObj = words[index];
        const {
          word,
          title,
          topik,
          importance,
          hanja,
          definition,
          pronunciation,
          partOfSpeech,
          meanings,
          hanjaMeanings
        } = wordObj;

        let displayHtml = `<strong>Word:</strong> ${word || ""}<br>`;
        displayHtml += `<strong>Title:</strong> ${title || word || ""}<br>`;
        displayHtml += `<strong>TOPIK Level:</strong> ${topik || "N/A"}<br>`;
        if (settings.importance && importance !== undefined) displayHtml += `<strong>Importance:</strong> ${importance}<br>`;
        if (settings.hanja && hanja !== undefined) displayHtml += `<strong>Hanja:</strong> ${hanja}<br>`;
        if (settings.hanjaMeanings && Array.isArray(hanjaMeanings) && hanjaMeanings.length > 0) {
          displayHtml += `<strong>Hanja Meanings:</strong><br>`;
          hanjaMeanings.forEach(({char, meaning}) => {
            displayHtml += `&nbsp;&nbsp;${char}: ${meaning}<br>`;
          });
        }
        displayHtml += `<strong>English Definition:</strong> ${definition || "N/A"}<br>`;
        if (settings.pronunciation && pronunciation !== undefined) displayHtml += `<strong>Pronunciation:</strong> ${pronunciation}<br>`;
        if (settings.partOfSpeech && partOfSpeech !== undefined) displayHtml += `<strong>Part of Speech:</strong> ${partOfSpeech}<br>`;
        if (settings.meanings && meanings !== undefined) displayHtml += `<strong>Meanings:</strong> ${meanings}`;

        // Navigation arrows
        let navHtml = `<div style="margin:10px 0;">
          <button id="prev-word" ${index === 0 ? "disabled" : ""}>&larr; Prev</button>
          <span style="margin:0 12px;">${index + 1} / ${words.length}</span>
          <button id="next-word" ${index === words.length - 1 ? "disabled" : ""}>Next &rarr;</button>
        </div>`;

        container.innerHTML = navHtml + `<div class="saved-word-card">${displayHtml}</div>`;

        // Add event listeners for arrows
        container.querySelector("#prev-word").addEventListener("click", () => {
          if (currentIndex > 0) {
            currentIndex--;
            renderWord(currentIndex);
          }
        });
        container.querySelector("#next-word").addEventListener("click", () => {
          if (currentIndex < words.length - 1) {
            currentIndex++;
            renderWord(currentIndex);
          }
        });
      }

      renderWord(currentIndex);
    });
  });

  // Placeholder for export feature
  exportWordsBtn.addEventListener("click", () => {
    alert("Export Words feature coming soon!");
  });
});
