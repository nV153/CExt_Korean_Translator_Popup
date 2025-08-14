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
    <label><input type="checkbox" id="show-pronunciation" style="margin-left:10px;"> Pronunciation</label>
    <label><input type="checkbox" id="show-partOfSpeech" style="margin-left:10px;"> Part of Speech</label>
    <label><input type="checkbox" id="show-meanings" style="margin-left:10px;"> Meanings</label>
  `;
  container.parentElement.insertBefore(filterDiv, container);

  // Default settings if none saved yet
  const defaultSettings = {
    importance: true,
    hanja: true,
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
    document.getElementById("show-pronunciation").checked = settings.pronunciation;
    document.getElementById("show-partOfSpeech").checked = settings.partOfSpeech;
    document.getElementById("show-meanings").checked = settings.meanings;
  });

  // Save settings when checkboxes change
  [
    "show-importance",
    "show-hanja",
    "show-pronunciation",
    "show-partOfSpeech",
    "show-meanings"
  ].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      const newSettings = {
        importance: document.getElementById("show-importance").checked,
        hanja: document.getElementById("show-hanja").checked,
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
          importance,
          hanja,
          definition,
          pronunciation,
          partOfSpeech,
          meanings
        } = wordObj;

        let displayHtml = `<strong>Word:</strong> ${word || ""}<br>`;
        displayHtml += `<strong>Title:</strong> ${title || word || ""}<br>`;
        if (settings.importance && importance !== undefined) displayHtml += `<strong>Importance:</strong> ${importance}<br>`;
        if (settings.hanja && hanja !== undefined) displayHtml += `<strong>Hanja:</strong> ${hanja}<br>`;
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

exportWordsBtn.addEventListener("click", () => {
  // Get saved words and user settings
  chrome.storage.local.get({ savedWords: [], saveSettings: defaultSettings }, (result) => {
    const words = result.savedWords;
    const settings = result.saveSettings;

    // Filter only unexported words
    const newWords = words.filter(w => !w.exported);
    if (newWords.length === 0) {
      alert("No new words to export.");
      return;
    }

    // Prepare CSV header based on selected settings
    const headers = ["Word", "Translation"];
    if (settings.hanja) headers.push("Hanja");
    if (settings.hanjaMeanings) headers.push("Hanja Meanings");
    if (settings.pronunciation) headers.push("Pronunciation");
    if (settings.partOfSpeech) headers.push("Part of Speech");
    if (settings.meanings) headers.push("Meanings");
    if (settings.topik) headers.push("TOPIK");
    if (settings.importance) headers.push("Importance");

    const csvRows = [headers.join(",")];

    newWords.forEach(w => {
      const row = [];

      // Word
      row.push(`"${(w.word || "").replace(/"/g, '""')}"`);

      // Translation/definition (mandatory, add placeholder if missing)
      row.push(`"${(w.definition || "Translation Error").replace(/"/g, '""')}"`);

      // Optional fields according to settings
      if (settings.hanja) row.push(`"${(w.hanja || "").replace(/"/g, '""')}"`);
      if (settings.hanjaMeanings) {
        const hanjaMeaningsStr = Array.isArray(w.hanjaMeanings)
          ? w.hanjaMeanings.map(h => `${h.char}:${h.meaning}`).join("; ")
          : "";
        row.push(`"${hanjaMeaningsStr.replace(/"/g, '""')}"`);
      }
      if (settings.pronunciation) row.push(`"${(w.pronunciation || "").replace(/"/g, '""')}"`);
      if (settings.partOfSpeech) row.push(`"${(w.partOfSpeech || "").replace(/"/g, '""')}"`);
      if (settings.meanings) {
        const meaningsStr = Array.isArray(w.meanings) ? w.meanings.join("; ") : w.meanings || "";
        row.push(`"${meaningsStr.replace(/"/g, '""')}"`);
      }
      if (settings.topik) row.push(`"${(w.topik || "").replace(/"/g, '""')}"`);
      if (settings.importance) row.push(`"${(w.importance || "").replace(/"/g, '""')}"`);

      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anki_export.csv';
    a.click();
    URL.revokeObjectURL(url);

    // Mark exported words
    const updatedWords = words.map(w => ({ ...w, exported: true }));
    chrome.storage.local.set({ savedWords: updatedWords }, () => {
      console.log(`${newWords.length} words exported and marked as exported.`);
    });
  });
});
