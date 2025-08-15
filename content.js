// content.js
// Injected content script for Korean Translator Popup extension
// Handles popup UI, translation, definitions, and API calls

// Groq API endpoint and model config
// Use global config object instead of import (Chrome extensions do not support import in content scripts unless type: module)
const API_URL = window.API_URL || "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = window.API_KEY || "PLACEHOLDER_FOR_API_KEY"; // Replace with your actual API key
const MODEL = window.MODEL || "llama3-70b-8192";

// Common headers for Groq API requests
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${API_KEY}`
};

  
  // Load showAutomatically setting
  let showAutomatically = false;
  chrome.storage.local.get({ saveSettings: {} }, (res) => {
    showAutomatically = !!(res.saveSettings && res.saveSettings.showAutomatically);
  });

  // Helper to highlight a word in the DOM
  function highlightSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
  // Highlighting removed
  }

  // Listen for mouseup to check for selection
  document.addEventListener("mouseup", (e) => {
    if (!showAutomatically) return;
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        // Highlighting removed
        showPopup(selection.toString());
      }
    }, 1000); // 1 second delay
  });

  // Listen for mouseover on words (for non-selection hover)
  document.body.addEventListener("mouseover", (e) => {
    if (!showAutomatically) return;
    const target = e.target;
    if (target.nodeType === 3 || !target.textContent || target.textContent.trim().split(/\s+/).length !== 1) return;
    const word = target.textContent.trim();
    // Only trigger for Korean words (Hangul/Hanja)
    if (!/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u4E00-\u9FFF]+/.test(word)) return;
    let hoverTimeout = target._hoverTimeout;
    if (hoverTimeout) clearTimeout(hoverTimeout);
    target._hoverTimeout = setTimeout(() => {
      // Select the word in the DOM (simulate selection)
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // Pass bounding rect to showPopup for positioning
      const rect = target.getBoundingClientRect();
      showPopup(word, rect);
    }, 1000);
    target.addEventListener("mouseout", () => {
      clearTimeout(target._hoverTimeout);
    }, { once: true });
  });





/**
 * Main entry: Shows the popup for the selected text, handles UI and tab logic.
 * @param {string} selectedText - The user-selected text to process.
 */
function showPopup(selectedText) {
  removePopup(); // Remove any existing popup
  if (!selectedText) return;

  let rect = null;
  let words = [];
  let currentIndex = 0;
  // If rect is passed, use it; otherwise, use selection
  if (arguments.length > 1 && arguments[1]) {
    rect = arguments[1];
    words = selectedText.trim().split(/\s+/);
  } else {
    words = selectedText.trim().split(/\s+/);
    if (words.length === 0) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    rect = range.getBoundingClientRect();
  }

  const popup = document.createElement("div");
  popup.className = "word-popup";

  const arrowsHTML = words.length > 1 ? `
      <div class="word-nav">
          <button class="nav-arrow" id="prev-word" ${currentIndex === 0 ? 'disabled' : ''}>&larr;</button>
          <span class="word-index">${currentIndex + 1} / ${words.length}</span>
          <button class="nav-arrow" id="next-word" ${currentIndex === words.length - 1 ? 'disabled' : ''}>&rarr;</button>
      </div>
  ` : '';

  // Dropdown replaces header, so put it on top
  const dropdownHTML = `
    <div class="word-dropdown-container">
      <select id="word-dropdown" class="minimal-dropdown">
        ${words.map((w, i) => `<option value="${i}" ${i === currentIndex ? 'selected' : ''}>${w}</option>`).join('')}
      </select>
    </div>
  `;

    const saveButtonHTML = `<button id="save-word-btn" class="save-word-btn" title="Save this word">💾 Save</button>`;

  popup.innerHTML = `
    ${dropdownHTML}
    ${arrowsHTML}
    ${saveButtonHTML}
    <div class="tabs">
      <button class="tab-button active" data-tab="definition">Definition</button>
      <button class="tab-button" data-tab="examples">Examples</button>
      <button class="tab-button" data-tab="hanjas">Hanjas / 한자</button>
      <button class="tab-button" data-tab="translation">Translation</button>
    </div>
    <div class="tab-contents">
      <div class="tab-content active" id="definition">Definition content coming soon...</div>
      <div class="tab-content" id="examples">Examples content coming soon...</div>
      <div class="tab-content" id="hanjas">Loading hanjas...</div>
      <div class="tab-content" id="translation">Loading translation...</div>
    </div>
  `;

  // Position popup as before
  const viewportWidth = window.innerWidth;
  const spaceOnRight = viewportWidth - rect.right;
  const spaceOnLeft = rect.left;

  // Position popup so it never covers the selected word
  let top, left;
  const popupHeight = 180; // estimate, adjust as needed
  const popupWidth = 520; // match your CSS
  const minDistance = 24; // minimum distance in px
  // Vertical position: above or below word
  if (rect.top > popupHeight + minDistance) {
    top = window.scrollY + rect.top - popupHeight - minDistance;
  } else {
    top = window.scrollY + rect.bottom + minDistance;
  }
  // Horizontal position: left or right of word, based on available space
  const spaceLeft = rect.left;
  const spaceRight = window.innerWidth - rect.right;
  if (spaceRight >= spaceLeft) {
    // Place popup to the right of the word
    left = window.scrollX + rect.right + minDistance;
    // If not enough space, clamp to window
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - minDistance;
    }
  } else {
    // Place popup to the left of the word, with extra separation
    const extraLeftDistance = minDistance + 32; // increase separation when left
    left = window.scrollX + rect.left - popupWidth - extraLeftDistance;
    // If not enough space, clamp to window
    if (left < 0) {
      left = extraLeftDistance;
    }
  }
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;

  document.body.appendChild(popup);

  // References to elements
  const buttons = popup.querySelectorAll(".tab-button");
  const contents = popup.querySelectorAll(".tab-content");
  const wordIndexSpan = popup.querySelector(".word-index");
  const prevButton = popup.querySelector("#prev-word");
  const nextButton = popup.querySelector("#next-word");
  const dropdown = popup.querySelector("#word-dropdown");
  const translationDiv = popup.querySelector("#translation");

  // Fetch full phrase translation once
  let fullTranslation = "Loading translation...";

  getTranslation(selectedText).then(translated => {
    fullTranslation = translated;
    updateTranslationTab(fullTranslation, translationDiv);
  }).catch(() => {
    fullTranslation = "Error loading translation.";
    updateTranslationTab(fullTranslation, translationDiv);
  });

  // Define updateTranslationTab to update the translation tab content
  function updateTranslationTab(translation, container) {
    if (container) {
      container.textContent = translation;
    }
  }

let currentDefinitionMsg = null;

  /**
   * Updates the popup content for the current word and active tab.
   * @param {number} index - Index of the word to display.
   */
  async function updateWord(index) {
    currentIndex = index;

    if (prevButton) prevButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === words.length - 1;
    if (wordIndexSpan) wordIndexSpan.textContent = `${currentIndex + 1} / ${words.length}`;
    if (dropdown && parseInt(dropdown.value, 10) !== currentIndex) dropdown.value = currentIndex;

    const activeTab = popup.querySelector(".tab-button.active");
    const activeTabId = activeTab ? activeTab.getAttribute("data-tab") : "definition";
    const activeContent = popup.querySelector(`#${activeTabId}`);

    if (activeTabId === "translation") {
      try {
        const translation = await getTranslation(words[currentIndex]);
        fullTranslation = translation;
        updateTranslationTab(fullTranslation, activeContent);
      } catch (err) {
        activeContent.textContent = "Error loading translation.";
      }
    } else if (activeTabId === "definition") {
      currentDefinitionMsg = await updateDefinitionTab(words[currentIndex], activeContent);
    } else if (activeTabId === "examples") {
      updateExamplesTab(words[currentIndex], activeContent);
    } else if (activeTabId === "hanjas") {
      // Always fetch definition before hanja tab
      const definitionMsg = currentDefinitionMsg || await updateDefinitionTab(words[currentIndex], activeContent);
      currentDefinitionMsg = definitionMsg;
      updateHanjasTab(words[currentIndex], activeContent, definitionMsg);
    }
  }

  // Arrow handlers
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (currentIndex > 0) updateWord(currentIndex - 1);
    });
  }
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (currentIndex < words.length - 1) updateWord(currentIndex + 1);
    });
  }

  // Dropdown change handler
  if (dropdown) {
    dropdown.addEventListener("change", e => {
      const idx = parseInt(e.target.value, 10);
      if (!isNaN(idx) && idx !== currentIndex) {
        updateWord(idx);
      }
    });
  }

  // Tab switching
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));

      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      const activeContent = popup.querySelector(`#${tabId}`);
      activeContent.classList.add("active");

      if (tabId === "translation") {
        activeContent.textContent = fullTranslation;
      } else {
        updateWord(currentIndex);
      }
    });
  });

  const saveButton = popup.querySelector("#save-word-btn");
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const wordToSave = words[currentIndex];
      const defMsg = currentDefinitionMsg || {};
      const title = defMsg.Endef || "";

      // Get user's save settings from storage
      chrome.storage.local.get({
        saveSettings: {
          importance: true,
          hanja: true,
          pronunciation: true,
          partOfSpeech: true,
          meanings: true,
          hanjaMeanings: false // default for new feature
        },
        savedWords: []
      }, async (result) => {
        const settings = result.saveSettings;
        let savedWords = result.savedWords;

        const wordData = {
          word: wordToSave,
          title: title,
          topik: defMsg.Topik || "N/A",
          definition: defMsg.Endef || ""
        };
        if (settings.importance) wordData.importance = defMsg.Importance || "N/A";
        if (settings.hanja) wordData.hanja = defMsg.Hanja || "N/A";
        if (settings.pronunciation) wordData.pronunciation = defMsg.Pronun || "N/A";
        if (settings.partOfSpeech) wordData.partOfSpeech = defMsg.PartSpeech || "N/A";
        if (settings.meanings) wordData.meanings = defMsg.Meanings || "No definition available.";

        // Save hanja meanings if enabled
        if (settings.hanjaMeanings && defMsg.Hanja && defMsg.Hanja !== "N/A") {
          // Only keep real hanja characters
          const hanjaChars = defMsg.Hanja.split('').filter(isHanjaChar);
          if (hanjaChars.length > 0) {
            // Fetch all meanings in parallel
            const hanjaMeanings = await Promise.all(
              hanjaChars.map(char => fetchHanjaMeaningWithGrok(char).catch(() => "(error loading meaning)"))
            );
            // Save as array of {char, meaning}
            wordData.hanjaMeanings = hanjaChars.map((char, i) => ({ char, meaning: hanjaMeanings[i] }));
          }
        }

        const alreadySaved = savedWords.some(w => w.word === wordToSave);
        if (alreadySaved) {
          showSaveBubble("Already saved!");
          saveButton.disabled = true;
          return;
        }

        savedWords.push(wordData);

        chrome.storage.local.set({ savedWords }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving word:", chrome.runtime.lastError);
            showSaveBubble("Failed to save!");
          } else {
            showSaveBubble("Saved!");
            saveButton.disabled = true;
          }
        });
      });
    });
  }

    // Helper: show a temporary speech bubble above the save button
    function showSaveBubble(text) {
      // Remove any existing bubble
      const oldBubble = document.getElementById("save-bubble");
      if (oldBubble) oldBubble.remove();

      const bubble = document.createElement("div");
      bubble.id = "save-bubble";
      bubble.className = "save-bubble";
      bubble.textContent = text;
      saveButton.parentElement.appendChild(bubble);

      setTimeout(() => {
        bubble.style.opacity = "0";
        setTimeout(() => bubble.remove(), 400);
      }, 1200);
    }


  updateWord(0);

  // Outside click to close popup
  /**
   * Closes the popup if the user clicks outside of it.
   * @param {MouseEvent} event
   */
  function onClickOutside(event) {
    const popup = document.querySelector(".word-popup");
    if (popup && !popup.contains(event.target)) {
      removePopup();
      document.removeEventListener("click", onClickOutside);
    }
  }
  document.addEventListener("click", onClickOutside);
}





/**
 * Removes all word popups from the page.
 */
function removePopup() {
    document.querySelectorAll(".word-popup").forEach(el => el.remove());
    // Remove highlight from all highlighted words
    document.querySelectorAll('.word-highlighted').forEach(el => {
      el.classList.remove('word-highlighted');
    });
}

/**
 * Updates the translation tab with the given translation.
 * @param {string} translation
 * @param {HTMLElement} container
  /**
   * Removes all word popups from the page and removes highlight from any highlighted word.
   */


    // Remove highlight from all highlighted words
    document.querySelectorAll('.word-highlighted').forEach(el => {
      el.style.background = '';
      el.style.borderRadius = '';
      el.style.boxShadow = '';
      el.classList.remove('word-highlighted');
    });
/**
 * Gets the translation for a word using Groq API (to German).
 * @param {string} word
 * @returns {Promise<string>}
 */
async function getTranslation(word) {
  try {
    const translated = await translateWithGroq(word, "de");
    return translated;
  } catch (err) {
    showErrorBubble("Translation error: Groq service unavailable");
    return "Error: " + err;
  }
}

/**
 * Calls Groq API to translate a word or phrase.
 * @param {string} word
 * @param {string} [targetLanguage="English"]
 * @returns {Promise<string>}
 */
async function translateWithGroq(word, targetLanguage = "English") {

  const systemPrompt = `You are a translation assistant. Translate the given word or phrase into ${targetLanguage}. Provide a short and precise translation only, no explanations.`;

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: word }
    ],
    temperature: 0.3
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error translating with Groq:", error);
    return "Translation error";
  }
}

let hanja = null
/**
 * Updates the definition tab with data from the extension's background API.
 * @param {string} word
 * @param {HTMLElement} container
 * @returns {Promise<Object|null>} - The definition message object or null on error.
 */
async function updateDefinitionTab(word, container) {
  container.textContent = "Loading definition...";
  try {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      throw new Error("chrome.runtime.sendMessage is not available. Are you running in Chrome extension context?");
    }
    const response = await chrome.runtime.sendMessage({
      action: "getDefinition",
      word: word
    });

    if (!response || !response.success) {
      throw new Error(response?.error || "Unknown error");
    }

    const msg = response.data.message || {};
    // Only keep real hanja characters
    const hanjaChars = (msg.Hanja || "").split('').filter(isHanjaChar);

    const definitionHTML = `
      <strong>Title:</strong> ${msg.Title || word}<br>
      <strong>TOPIK Level:</strong> ${msg.Topik || "N/A"}<br>
      <strong>Importance:</strong> ${msg.Importance || "N/A"}<br>
      <strong>Hanja:</strong> ${hanjaChars.length > 0 ? hanjaChars.join(' ') : "N/A"}<br>
      <strong>English Definition:</strong> ${msg.Endef || "N/A"}<br>
      <strong>Pronunciation:</strong> ${msg.Pronun || "N/A"}<br>
      <strong>Part of Speech:</strong> ${msg.PartSpeech || "N/A"}<br>
      <strong>Meanings:</strong> ${msg.Meanings || "No definition available."}
    `;

    container.innerHTML = definitionHTML;

    return msg; // Return entire message object

  } catch (err) {
    container.textContent = "Error loading definition: " + err.message;
    return null;
  }
}


/**
 * Updates the examples tab with 3 Korean example sentences from Groq API.
 * @param {string} word
 * @param {HTMLElement} container
 */
async function updateExamplesTab(word, container) {
  container.textContent = "Loading examples...";

  const systemPrompt = `
You are a language assistant. Provide exactly 3 example sentences in Korean for the given word or phrase, categorized by difficulty level: easy, medium, and hard. Format your response exactly as:

Easy: <easy example sentence in Korean>
Medium: <medium example sentence in Korean>
Hard: <hard example sentence in Korean>

Add a line break after each example sentence (i.e., after each difficulty level). Do not add explanations or anything else.
`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`
  };

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: word }
    ],
    temperature: 0.3
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    container.innerHTML = data.choices[0].message.content.trim().replace(/\n/g, "<br>");

  } catch (error) {
    console.error("Error fetching examples with Groq:", error);
    showErrorBubble("Groq service unavailable for examples");
    container.textContent = "Error loading examples";
  }
}

/**
 * Updates the Hanjas tab with meanings for each hanja character.
 * @param {string} word
 * @param {HTMLElement} container
 */
async function updateHanjasTab(word, container, definitionMsg) {
  const hanjaValue = definitionMsg?.Hanja || "N/A";
  if (!hanjaValue || hanjaValue === "N/A") {
    container.textContent = "No Hanja available.";
    return;
  }

  // Only keep real hanja characters
  const hanjaChars = hanjaValue.split('').filter(isHanjaChar);
  if (hanjaChars.length === 0) {
    container.textContent = "No valid Hanja characters found.";
    return;
  }

  // Start with heading
  container.innerHTML = `<strong>Hanja / 한자:</strong><br><br>`;

  const fragment = document.createDocumentFragment();

  // Create all <p> elements first
  const ps = hanjaChars.map(char => {
    const p = document.createElement("p");
    p.textContent = `${char} = Loading meaning...`;
    fragment.appendChild(p);
    fragment.appendChild(document.createElement("br"));
    return p;
  });

  container.appendChild(fragment);

  // Fetch all meanings in parallel
  const promises = hanjaChars.map(char => fetchHanjaMeaningWithGrok(char)
    .catch(() => "(error loading meaning)")
  );

  const meanings = await Promise.all(promises);

  // Update <p> elements when each meaning arrives
  ps.forEach((p, i) => {
    p.textContent = `${hanjaChars[i]} = ${meanings[i]}`;
  });
}

/**
 * Helper: Fetches the English meaning of a hanja character from Groq API.
 * @param {string} char
 * @returns {Promise<string>}
 */
async function fetchHanjaMeaningWithGrok(char) {

  const systemPrompt = `You are a Korean language assistant. Provide a short, precise English meaning of the following Hanja character without extra explanation.`;

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: char }
    ],
    temperature: 0.3
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error fetching hanja meaning with Groq:", error);
    showErrorBubble("Groq service unavailable for hanja");
    return "(error loading meaning)";
  }
}

/**
 * Checks if a character is a hanja (CJK ideograph).
 * @param {string} char
 * @returns {boolean}
 */
function isHanjaChar(char) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||    // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) ||    // Extension A
    (code >= 0x20000 && code <= 0x2A6DF) ||  // Extension B
    (code >= 0x2A700 && code <= 0x2B73F) ||  // Extension C
    (code >= 0x2B740 && code <= 0x2B81F) ||  // Extension D
    (code >= 0x2B820 && code <= 0x2CEAF)     // Extension E
  );
}

// Helper: show a temporary error bubble above the popup
function showErrorBubble(text) {
  // Remove any existing bubble
  const oldBubble = document.getElementById("error-bubble");
  if (oldBubble) oldBubble.remove();

  const popup = document.querySelector(".word-popup");
  if (!popup) return;

  const bubble = document.createElement("div");
  bubble.id = "error-bubble";
  bubble.className = "save-bubble";
  bubble.style.background = "#d32f2f";
  bubble.style.color = "#fff";
  bubble.textContent = text;
  bubble.style.top = "-60px";
  popup.appendChild(bubble);

  setTimeout(() => {
    bubble.style.opacity = "0";
    setTimeout(() => bubble.remove(), 600);
  }, 1800);
}


window.showPopup = showPopup;
