// background.js

// Context menu creation on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "showWordPopup",
    title: "Show selected word popup",
    contexts: ["selection"]
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "showWordPopup") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (word) => {
        if (typeof showPopup === "function") {
          showPopup(word);
        }
      },
      args: [info.selectionText]
    });
  }
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "show-word-popup") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const word = window.getSelection().toString().trim();
        if (word && typeof showPopup === "function") {
          showPopup(word);
        }
      }
    });
  }
});

// Handle async message for definition API
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getDefinition") {
    (async () => {
      try {
        const response = await fetch(`http://localhost:8080/get?word=${encodeURIComponent(request.word)}`);
        if (!response.ok) {
          const errorText = await response.text();
          sendResponse({ success: false, error: `API error ${response.status}: ${errorText}` });
          return;
        }
        const data = await response.json();
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === "saveWord") {
    // Load existing saved words from storage
    chrome.storage.local.get({ savedWords: {} }, (result) => {
      const savedWords = result.savedWords;

      // Save or update the word
      savedWords[request.word] = request.translation;

      // Save back to storage
      chrome.storage.local.set({ savedWords }, () => {
        sendResponse({ success: true });
      });
    });
    // Return true to indicate async response
    return true;
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'options.html'
  });
});

