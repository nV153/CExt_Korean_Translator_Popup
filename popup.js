const params = new URLSearchParams(window.location.search);
const word = params.get("word") || "";
document.getElementById("word").textContent = word;
