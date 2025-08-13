const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = "PLACEHOLDER";
const MODEL = "llama3-70b-8192";


const headers = {
"Content-Type": "application/json",
"Authorization": `Bearer ${API_KEY}`
};


function showPopup(selectedText) {
  removePopup();
  if (!selectedText) return;

  const words = selectedText.trim().split(/\s+/);
  if (words.length === 0) return;

  let currentIndex = 0;

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

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

  let top = window.scrollY + rect.top - 20;
  let left;

  if (spaceOnRight >= spaceOnLeft) {
      left = window.scrollX + rect.right + 10;
  } else {
      left = window.scrollX + rect.left - 520; // match your popup width in css (520px)
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

let currentDefinitionMsg = null;

async function updateWord(index) {
  currentIndex = index;

  if (prevButton) prevButton.disabled = currentIndex === 0;
  if (nextButton) nextButton.disabled = currentIndex === words.length - 1;
  if (wordIndexSpan) wordIndexSpan.textContent = `${currentIndex + 1} / ${words.length}`;

  if (dropdown && parseInt(dropdown.value, 10) !== currentIndex) {
    dropdown.value = currentIndex;
  }

  const activeTab = popup.querySelector(".tab-button.active");
  const activeTabId = activeTab ? activeTab.getAttribute("data-tab") : "definition";
  const activeContent = popup.querySelector(`#${activeTabId}`);

  if (activeTabId === "translation") {
    activeContent.textContent = fullTranslation;
  } else if (activeTabId === "definition") {
    currentDefinitionMsg = await updateDefinitionTab(words[currentIndex], activeContent);  // await entire msg
  } else if (activeTabId === "examples") {
    updateExamplesTab(words[currentIndex], activeContent);
  } else if (activeTabId === "hanjas") {
    updateHanjasTab(words[currentIndex], activeContent);
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

  console.log("currentDefinitionMsg at save:", currentDefinitionMsg);
  const saveButton = popup.querySelector("#save-word-btn");
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const wordToSave = words[currentIndex];
      const definition = currentDefinitionMsg?.Endef || "";

      alert(`Saving word: ${wordToSave} — Definition: ${definition}`);

      chrome.storage.local.get({ savedWords: [] }, (result) => {
        let savedWords = result.savedWords;

        // Kein Duplikat-Check, einfach speichern
        savedWords.push({
          word: wordToSave,
          definition: definition
        });

        chrome.storage.local.set({ savedWords }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving word:", chrome.runtime.lastError);
            alert("Failed to save word, try again.");
          } else {
            alert(`Saved "${wordToSave}" successfully.`);
          }
        });
      });
    });
  } else {
    console.error("Save button not found!");
  }


  updateWord(0);

  // Outside click to close popup
  function onClickOutside(event) {
    const popup = document.querySelector(".word-popup");
    if (popup && !popup.contains(event.target)) {
      removePopup();
      document.removeEventListener("click", onClickOutside);
    }
  }
  document.addEventListener("click", onClickOutside);
}





function removePopup() {
    document.querySelectorAll(".word-popup").forEach(el => el.remove());
}

function updateTranslationTab(translation, container) {
  container.textContent = translation;
}

async function getTranslation(word) {
  try {
    const translated = await translateWithGroq(word, "de");
    return translated;
  } catch (err) {
    return "Error: " + err;
  }
}

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
async function updateDefinitionTab(word, container) {
  container.textContent = "Loading definition...";
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getDefinition",
      word: word
    });

    if (!response || !response.success) {
      throw new Error(response?.error || "Unknown error");
    }

    const msg = response.data.message || {};
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
    container.textContent = "Error loading examples";
  }
}

async function updateHanjasTab(word, container) {
  if (!hanja || hanja === "N/A") {
    container.textContent = "No Hanja available.";
    return;
  }

  const hanjaChars = hanja.split('');

  // Start with the heading and a line break before the hanja list
  container.innerHTML = `<strong>Hanja / 한자:</strong><br><br>`;

  const fragment = document.createDocumentFragment();

  for (const char of hanjaChars) {
    const p = document.createElement("p");
    p.textContent = `${char} = Loading meaning...`;
    fragment.appendChild(p);

    // Add a <br> after each meaning line for spacing
    const br = document.createElement("br");
    fragment.appendChild(br);

    try {
      const meaning = await fetchHanjaMeaningWithGrok(char);
      p.textContent = `${char} = ${meaning}`;
    } catch (err) {
      p.textContent = `${char} = (error loading meaning)`;
    }
  }

  container.appendChild(fragment);
}

// Helper function to fetch hanja meaning from Grok API
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
}

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



window.showPopup = showPopup;
