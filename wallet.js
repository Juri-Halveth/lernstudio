/* Optional EIP-1193 account display. This adapter never signs or sends transactions. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LearningWallet = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const CHAINS = Object.freeze({ "0x1": "Ethereum", "0x38": "BNB Smart Chain", "0x89": "Polygon", "0xa": "Optimism", "0xa4b1": "Arbitrum One", "0x2105": "Base", "0xaa36a7": "Sepolia (Testnetz)" });
  function create(provider, onChange) {
    let state = { address: null, chainId: null, chainName: null, pending: false, message: "Wallet ist freiwillig. Du kannst sofort lernen." };
    let epoch = 0, listening = false, destroyed = false;
    let accountRevision = 0, chainRevision = 0;
    const emit = () => { if (!destroyed && onChange) onChange({ ...state }); };
    const validAddress = value => typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
    const validChain = value => typeof value === "string" && /^0x[0-9a-f]+$/i.test(value);
    function accountsChanged(accounts) {
      accountRevision++;
      const address = Array.isArray(accounts) ? accounts[0] : null;
      if (!validAddress(address)) { disconnect(); return; }
      state.address = address;
      state.message = "Adresse verbunden. Es wurde nichts signiert oder überwiesen.";
      emit();
    }
    function chainChanged(chainId) {
      chainRevision++;
      state.chainId = validChain(chainId) ? chainId.toLowerCase() : null;
      state.chainName = state.chainId ? CHAINS[state.chainId] || "EVM-Netzwerk " + state.chainId : "Netzwerk unbekannt";
      emit();
    }
    function unlisten() {
      if (listening && typeof provider?.removeListener === "function") {
        provider.removeListener("accountsChanged", accountsChanged);
        provider.removeListener("chainChanged", chainChanged);
        provider.removeListener("disconnect", disconnect);
      }
      listening = false;
    }
    function disconnect() {
      epoch++; unlisten();
      state = { address: null, chainId: null, chainName: null, pending: false, message: "Auf dieser Seite getrennt. Wallet-Freigaben verwaltest du in deiner Wallet." };
      emit();
    }
    async function connect() {
      if (destroyed || state.pending) return;
      if (!provider || typeof provider.request !== "function") {
        state.message = "Keine Browser-Wallet gefunden. Das Lernen funktioniert trotzdem vollständig."; emit(); return;
      }
      const run = ++epoch;
      const accountStart = accountRevision, chainStart = chainRevision;
      if (!listening && typeof provider.on === "function") {
        provider.on("accountsChanged", accountsChanged); provider.on("chainChanged", chainChanged); provider.on("disconnect", disconnect); listening = true;
      }
      state.pending = true; state.message = "Bestätige die Verbindung in deiner Wallet."; emit();
      try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        if (run !== epoch || destroyed) return;
        if (!Array.isArray(accounts) || !validAddress(accounts[0])) throw new Error("NO_ACCOUNT");
        const chainId = await provider.request({ method: "eth_chainId" });
        if (run !== epoch || destroyed) return;
        if (accountRevision === accountStart) state.address = accounts[0];
        if (chainRevision === chainStart) state.chainId = validChain(chainId) ? chainId.toLowerCase() : null;
        state.chainName = state.chainId ? CHAINS[state.chainId] || "EVM-Netzwerk " + state.chainId : "Netzwerk unbekannt";
        state.message = "Adresse verbunden. Es wurde nichts signiert oder überwiesen.";
      } catch (error) {
        if (run !== epoch || destroyed) return;
        unlisten();
        state.address = null; state.chainId = null; state.chainName = null;
        state.message = error?.code === 4001 ? "Verbindung abgelehnt. Du kannst ohne Wallet weiterlernen." : "Verbindung nicht möglich. Öffne deine Wallet und versuche es erneut.";
      } finally { if (run === epoch && !destroyed) { state.pending = false; emit(); } }
    }
    return { connect, disconnect, snapshot: () => ({ ...state }), destroy: () => { disconnect(); destroyed = true; } };
  }
  return Object.freeze({ create });
});
