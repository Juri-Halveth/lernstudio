(function () {
  "use strict";
  const input = document.getElementById("draft");
  const status = document.getElementById("draftStatus");
  document.getElementById("copyDraft").addEventListener("click", async function () {
    if (!input.value.trim()) { status.textContent = "Schreibe zuerst deine Frage."; input.focus(); return; }
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent = "Kopiert. Du kannst die Frage selbst ins Forum einfügen.";
    } catch (error) {
      input.focus(); input.select();
      status.textContent = "Automatisches Kopieren ist hier nicht verfügbar. Der Text ist zum manuellen Kopieren markiert.";
    }
  });
})();
