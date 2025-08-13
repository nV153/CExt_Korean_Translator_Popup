CExt_Korean_Translator_Popup - Chrome Extension

This is a small Chrome extension project designed to showcase relevant skills such as JavaScript, HTML, and browser API usage.
This Chrome extension focuses on providing detailed translations and definitions for Korean words selected on any webpage. It displays a popup showing meanings, examples, Hanja characters, and translations.

Features:
- Popup displaying Korean word information: definitions, examples, hanja, and translations.
- Navigation through multiple selected words to see their own meaning as well as the meaning of the full sentence.
- Save favorite words with their English definitions locally.
- Options page to view saved words.
- Keyboard shortcut (Ctrl+Shift+H) to manually trigger the popup.

Backend & Translation Services:
- The current translation and dictionary data rely on a local backend server based on NaverDictionary by choonyongchan (https://github.com/choonyongchan/NaverDictionary).
- For the full sentence translations and single Hanja meanings, the extension uses the Groq API, requiring the user to provide their own API key and model for access.
- Note: In a production release, the backend service and API integration would be replaced with reliable, hosted services to ensure stable and seamless user experience without local setup.

Installation and Setup:

1. Clone or download this repository.
2. Open Chrome and navigate to chrome://extensions.
3. Enable "Developer mode" and click "Load unpacked".
4. Select the extension folder.
5. Insert your personal API Key in the extension’s configuration.
6. Run the local backend server based on NaverDictionary (https://github.com/choonyongchan/NaverDictionary).

Usage:
- Select Korean text on any webpage to trigger the popup with detailed info.
- Navigate between words if multiple are selected.
- Save interesting words and definitions for later review.
- Access saved words via the extension's Options page.

Development:
- Popup UI styled via style.css.
- Popup logic in content.js.
- Options page logic in options.js.
- Saves data using Chrome's storage.local API.
