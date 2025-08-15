// options.js
// Script for the extension's options/settings page

document.addEventListener("DOMContentLoaded", () => {
  // Render export history on page load
  function renderExportHistory() {
    chrome.storage.local.get({ exportHistory: [] }, (res) => {
      const list = document.getElementById("export-history-list");
      if (!list) return;
      list.innerHTML = "";
      if (!res.exportHistory || res.exportHistory.length === 0) {
        list.innerHTML = "<li>No exports yet.</li>";
        return;
      }
      res.exportHistory.slice().reverse().forEach(h => {
        const li = document.createElement("li");
        li.textContent = `${h.filename} (${h.timestamp}, ${h.count} words)`;
        list.appendChild(li);
      });
    });
  }

  renderExportHistory();
  const showWordsBtn = document.getElementById("show-saved-btn");
  const exportWordsBtn = document.getElementById("export-btn");
  const container = document.getElementById("saved-words-container");
  // Add export history container FIRST
  const exportHistoryDiv = document.createElement("div");
  exportHistoryDiv.id = "export-history";
  exportHistoryDiv.className = "options-section";
  exportHistoryDiv.innerHTML = `<h3>Export History</h3><ul id="export-history-list"></ul>`;
  container.parentElement.insertBefore(exportHistoryDiv, container.nextSibling);

  // Add export history toggle button
  const showHistoryBtn = document.createElement("button");
  showHistoryBtn.id = "show-history-btn";
  showHistoryBtn.textContent = "Show Export History";
  showHistoryBtn.style.marginBottom = "12px";
  exportHistoryDiv.parentElement.insertBefore(showHistoryBtn, exportHistoryDiv);
  exportHistoryDiv.style.display = "none";

  showHistoryBtn.addEventListener("click", () => {
    if (exportHistoryDiv.style.display === "none") {
      exportHistoryDiv.style.display = "block";
      showHistoryBtn.textContent = "Hide Export History";
    } else {
      exportHistoryDiv.style.display = "none";
      showHistoryBtn.textContent = "Show Export History";
    }
  });



  // Create filter box for display and save settings
  const filterDiv = document.createElement("div");
  filterDiv.id = "display-attributes";
  filterDiv.className = "options-section";
  filterDiv.innerHTML = `
    <h3>Word Attributes</h3>
    <p>Control which attributes are <strong>shown</strong> and <strong>saved</strong>:</p>
    <div class="word-attributes-grid">
      <label><input type="checkbox" id="show-importance"> Importance</label>
      <label><input type="checkbox" id="show-hanja"> Hanja</label>
      <label><input type="checkbox" id="show-pronunciation"> Pronunciation</label>
      <label><input type="checkbox" id="show-partOfSpeech"> Part of Speech</label>
      <label><input type="checkbox" id="show-meanings"> Meanings</label>
    </div>
    <!-- Word attributes end -->
  `;
  // Add 'Show Automatically' as a separate option below
  const showAutoDiv = document.createElement("div");
  showAutoDiv.className = "options-section";
  showAutoDiv.innerHTML = `
  <h3>Options</h3>
  <label><input type="checkbox" id="show-automatically"> Show Automatically</label>
  `;
  container.parentElement.insertBefore(filterDiv, container);
  filterDiv.parentElement.insertBefore(showAutoDiv, filterDiv.nextSibling);

  // Default settings if none saved yet
  const defaultSettings = {
    importance: true,
    hanja: true,
    pronunciation: true,
    partOfSpeech: true,
    meanings: true
  ,showAutomatically: false
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
    document.getElementById("show-automatically").checked = settings.showAutomatically;
  });

  // Save settings when checkboxes change
  [
    "show-importance",
    "show-hanja",
    "show-pronunciation",
    "show-partOfSpeech",
    "show-meanings"
  ,"show-automatically"
  ].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      const newSettings = {
        importance: document.getElementById("show-importance").checked,
        hanja: document.getElementById("show-hanja").checked,
        pronunciation: document.getElementById("show-pronunciation").checked,
        partOfSpeech: document.getElementById("show-partOfSpeech").checked,
        meanings: document.getElementById("show-meanings").checked
    ,showAutomatically: document.getElementById("show-automatically").checked
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

        // Navigation arrows and delete button
        let navHtml = `<div style="margin:10px 0; display: flex; align-items: center; gap: 8px;">
          <button id="prev-word" ${index === 0 ? "disabled" : ""}>&larr; Prev</button>
          <span style="margin:0 12px;">${index + 1} / ${words.length}</span>
          <button id="next-word" ${index === words.length - 1 ? "disabled" : ""}>Next &rarr;</button>
          <button id="delete-word" style="margin-left:auto; background:#e57373; color:#fff; border-radius:6px;">🗑️ Delete</button>
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

        // Add event listener for delete button
        container.querySelector("#delete-word").addEventListener("click", () => {
          words.splice(index, 1);
          chrome.storage.local.set({ savedWords: words }, () => {
            if (words.length === 0) {
              container.textContent = "No saved words found.";
            } else {
              currentIndex = Math.max(0, Math.min(currentIndex, words.length - 1));
              renderWord(currentIndex);
            }
          });
        });
      }

      renderWord(currentIndex);
    });
  });

  // Placeholder for export feature
  exportWordsBtn.addEventListener("click", () => {
  // Get user-selected fields
    const fields = [];
    if (document.getElementById("show-importance").checked) fields.push("importance");
    if (document.getElementById("show-hanja").checked) fields.push("hanja");
    if (document.getElementById("show-pronunciation").checked) fields.push("pronunciation");
    if (document.getElementById("show-partOfSpeech").checked) fields.push("partOfSpeech");
    if (document.getElementById("show-meanings").checked) fields.push("meanings");
    // hanjaMeanings support (if present)
    if (document.getElementById("show-hanjaMeanings")) {
      if (document.getElementById("show-hanjaMeanings").checked) fields.push("hanjaMeanings");
    }

    chrome.storage.local.get({ savedWords: [] }, (result) => {
      let words = result.savedWords;
      // Only export unexported words
      const unexported = words.filter(w => !w.exported);
      if (unexported.length === 0) {
        alert("No new words to export.");
        return;
      }

      // CSV header: word (front), then selected fields (back)
      const header = ["word", ...fields];
      const rows = [header];

      unexported.forEach(wordObj => {
        const row = [];
        // Front side: word
        row.push(csvEscape(wordObj.word || ""));
        // Back side: selected fields
        fields.forEach(field => {
          let val = wordObj[field];
          if (field === "meanings" && Array.isArray(val)) {
            val = val.join("; ");
          }
          if (field === "hanjaMeanings" && Array.isArray(val)) {
            val = val.map(h => `${h.char}: ${h.meaning}`).join("; ");
          }
          if (val === undefined || val === null || val === "") {
            if (field === "definition") {
              val = "Translation Error";
            } else {
              val = "";
            }
          }
          row.push(csvEscape(val));
        });
        rows.push(row);
      });

      // CSV string
      const csv = rows.map(r => r.join(",")).join("\r\n");

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
  const filename = `exported_words_${timestamp}.csv`;
  a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      // Mark exported words
      words = words.map(w => {
        if (!w.exported) w.exported = true;
        return w;
      });
      // Save export history
      chrome.storage.local.get({ exportHistory: [] }, (res) => {
        const history = res.exportHistory || [];
        history.push({ filename, timestamp: new Date().toLocaleString(), count: unexported.length });
        chrome.storage.local.set({ savedWords: words, exportHistory: history }, () => {
          renderExportHistory();
        });
      });
    });

    // Helper: escape quotes and commas for CSV
    function csvEscape(val) {
      if (typeof val !== "string") val = String(val);
      if (val.includes('"') || val.includes(",") || val.includes("\n")) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }

    // Helper: render export history
    function renderExportHistory() {
      chrome.storage.local.get({ exportHistory: [] }, (res) => {
        const list = document.getElementById("export-history-list");
        if (!list) return;
        list.innerHTML = "";
        if (!res.exportHistory || res.exportHistory.length === 0) {
          list.innerHTML = "<li>No exports yet.</li>";
          return;
        }
        res.exportHistory.slice().reverse().forEach(h => {
          const li = document.createElement("li");
          li.textContent = `${h.filename} (${h.timestamp}, ${h.count} words)`;
          list.appendChild(li);
        });
      });
    }

    renderExportHistory();

    // Helper: escape quotes and commas for CSV
    function csvEscape(val) {
      if (typeof val !== "string") val = String(val);
      if (val.includes('"') || val.includes(",") || val.includes("\n")) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }
  });
});
