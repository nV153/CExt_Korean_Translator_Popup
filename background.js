
// background.js
// Chrome extension background script for Chrome Extension Korean Translator Popup
// Handles context menu, keyboard shortcuts, API requests, and storage

// Context menu creation on install

// Add context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "showWordPopup",
    title: "Show selected word popup",
    contexts: ["selection"]
  });
});


// Show popup when context menu item is clicked
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


// Show popup when keyboard shortcut is used
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


// Listen for messages: fetch definition or save word
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getDefinition") {
    // Fetch word definition from local API
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
    // Save or update word translation in local storage
    chrome.storage.local.get({ savedWords: {} }, (result) => {
      const savedWords = result.savedWords;
      savedWords[request.word] = request.translation;
      chrome.storage.local.set({ savedWords }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});


// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'options.html'
  });
});

