(() => {
  "use strict";

  // Eigener Schlüssel für den neuen Seitenstart: Eine alte, noch aus dem
  // Themenwahl-Modus stammende Stummschaltung darf den Neustart nicht erben.
  const STORAGE_KEY = "ls_ambient_muted_v2";
  const MOBILE_AUDIO = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
  const MUSIC_FILE = MOBILE_AUDIO ? "lernreise-mobile-v3.mp3" : "lernreise-hintergrund-v2.mp3";
  const BIRD_FILES = ["voegel-wald-web-v2.mp3", "voegel-garten-web-v2.mp3"];
  const music = new Audio(MUSIC_FILE);
  const birds = BIRD_FILES.map(file => new Audio(file));

  let active = false;
  let muted = false;
  let button = null;
  let birdTimer = null;
  let nextBird = 0;
  let unlockHandler = null;
  const fadeRuns = new WeakMap();

  music.loop = true;
  music.preload = "auto";
  birds.forEach(track => { track.preload = "metadata"; });

  try { muted = localStorage.getItem(STORAGE_KEY) === "1"; } catch (error) {}

  // Der niedrige Pegel ist direkt in die Dateien eingebrannt. Das schützt auch
  // Mobilbrowser, die die programmatische Lautstärke eines Audioelements ignorieren.
  const musicVolume = () => 1;

  function fade(track, target, duration = 1400) {
    const run = (fadeRuns.get(track) || 0) + 1;
    fadeRuns.set(track, run);
    const start = track.volume;
    const started = performance.now();
    const step = now => {
      if (fadeRuns.get(track) !== run) return;
      const progress = Math.min(1, (now - started) / duration);
      track.volume = Math.max(0, Math.min(1, start + (target - start) * progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function updateButton() {
    if (!button) return;
    const audible = active && !muted;
    button.textContent = audible ? "Musik aus" : "Musik an";
    button.setAttribute("aria-pressed", String(audible));
    button.title = audible ? "Musik und Naturklänge ausschalten" : "Musik und Naturklänge einschalten";
  }

  function removeUnlockFallback() {
    if (!unlockHandler) return;
    document.removeEventListener("pointerdown", unlockHandler, true);
    document.removeEventListener("keydown", unlockHandler, true);
    unlockHandler = null;
  }

  function installUnlockFallback() {
    if (unlockHandler || muted) return;
    unlockHandler = event => {
      if (button && button.contains(event.target)) return;
      removeUnlockFallback();
      start();
    };
    document.addEventListener("pointerdown", unlockHandler, true);
    document.addEventListener("keydown", unlockHandler, true);
  }

  function stopBirds() {
    clearTimeout(birdTimer);
    birds.forEach(track => {
      track.pause();
      track.currentTime = 0;
    });
  }

  function scheduleBirds(first = false) {
    clearTimeout(birdTimer);
    // Auf Smartphones sind die besonders leisen Vögel bereits fest in der
    // mobilen Tonspur enthalten. Zusätzliche Clips könnten dort unvermittelt
    // und abhängig vom Gerätemixer zu laut einsetzen.
    if (MOBILE_AUDIO) return;
    if (!active || muted) return;
    const delay = first ? 25000 + Math.random() * 10000 : 22000 + Math.random() * 26000;
    birdTimer = setTimeout(async () => {
      if (!active || muted) return;
      const track = birds[nextBird % birds.length];
      nextBird += 1;
      track.currentTime = 0;
      track.volume = 1;
      try { await track.play(); } catch (error) {}
      scheduleBirds(false);
    }, delay);
  }

  async function start() {
    active = true;
    if (!muted) {
      music.volume = MOBILE_AUDIO ? 1 : 0.02;
      try { await music.play(); } catch (error) {
        active = false;
        installUnlockFallback();
        updateButton();
        return false;
      }
      removeUnlockFallback();
      // Die mobile Datei enthält ihren eigenen weichen Verlauf: erst Vögel,
      // dann nach acht Sekunden Musik mit einer 15-Sekunden-Einblendung.
      if (!MOBILE_AUDIO) fade(music, musicVolume(), 10000);
      scheduleBirds(true);
    }
    updateButton();
    return true;
  }

  function select() {
    if (!active) return start();
    if (!muted && music.paused) return start();
    updateButton();
    return Promise.resolve(true);
  }

  function quiet() {
    active = false;
    stopBirds();
    fade(music, 0, 1100);
    setTimeout(() => {
      if (!active) {
        music.pause();
        music.currentTime = 0;
      }
    }, 1200);
    updateButton();
  }

  async function toggle() {
    // Wurde hörbares Autoplay nur vom Browser angehalten, bedeutet „Musik an“
    // einen Startwunsch. In diesem Zustand darf der Klick nicht versehentlich
    // als neue Stummschaltung gespeichert werden.
    if (!active && !muted) {
      await start();
      updateButton();
      return;
    }
    muted = !muted;
    try { localStorage.setItem(STORAGE_KEY, muted ? "1" : "0"); } catch (error) {}
    if (muted) {
      removeUnlockFallback();
      stopBirds();
      fade(music, 0, 500);
      setTimeout(() => { if (muted) music.pause(); }, 550);
    } else if (active) {
      music.volume = MOBILE_AUDIO ? 1 : 0;
      try { await music.play(); } catch (error) {}
      if (!MOBILE_AUDIO) fade(music, musicVolume(), 10000);
      scheduleBirds(true);
    } else {
      await start();
    }
    updateButton();
  }

  function attach(toggleButton) {
    button = toggleButton || null;
    if (!button) return;
    button.addEventListener("click", toggle);
    updateButton();
    if (!muted) start();
  }

  window.LernstudioAmbient = {attach, select, quiet};
})();
