document.addEventListener("DOMContentLoaded", () => {
  const showWordsBtn = document.getElementById("show-saved-btn");
  const exportWordsBtn = document.getElementById("export-btn");
  const container = document.getElementById("saved-words-container");

  showWordsBtn.addEventListener("click", () => {
    chrome.storage.local.get({ savedWords: [] }, (result) => {
      const words = result.savedWords;
      container.innerHTML = "";

      if (words.length === 0) {
        container.textContent = "No saved words found.";
        return;
      }

      words.forEach(({ word, definitionData }) => {
        const definition = definitionData?.Endef || "No definition";
        const div = document.createElement("div");
        div.textContent = `${word} — ${definition}`;
        container.appendChild(div);
      });
    });
  });

  exportWordsBtn.addEventListener("click", () => {
    alert("Export Words feature coming soon!");
  });
});
