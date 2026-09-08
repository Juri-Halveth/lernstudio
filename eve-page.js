(function () {
  "use strict";
  const address = document.getElementById("walletAddress");
  const network = document.getElementById("walletNetwork");
  const status = document.getElementById("walletStatus");
  const connect = document.getElementById("connectWallet");
  const disconnect = document.getElementById("disconnectWallet");
  let wallet = null;
  function draw(state) {
    address.textContent = state.address || "Keine Wallet verbunden";
    network.textContent = state.chainName || "";
    status.textContent = state.message;
    connect.disabled = state.pending;
    connect.hidden = !!state.address;
    connect.textContent = state.pending ? "Warte auf deine Wallet …" : "Wallet verbinden";
    disconnect.hidden = !state.address && !state.pending;
  }
  connect.addEventListener("click", () => {
    if (!wallet) wallet = window.LearningWallet.create(window.ethereum, draw);
    wallet.connect();
  });
  disconnect.addEventListener("click", () => { if (wallet) wallet.disconnect(); });
  window.addEventListener("pagehide", () => { if (wallet) { wallet.destroy(); wallet = null; } });
})();
