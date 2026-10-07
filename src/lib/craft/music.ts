import { MUSIC_FILE, MUSIC_VOLUME } from "@/config/audio";
import { getAudioContext } from "./sounds";

const KEY = "crafty:music";
const url = (p: string) => `${import.meta.env.BASE_URL}${p}`.replace(/\/{2,}/g, "/");

let enabled = true;
try {
  enabled = localStorage.getItem(KEY) !== "off";
} catch {
  /* ignore */
}

let el: HTMLAudioElement | null = null;
let fileFailed = false;
let wantPlaying = false;
const listeners = new Set<() => void>();

// ---------- procedural fallback (used when background.mp3 is missing) ----------
const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 261.63, 329.63], // C
  [196.0, 246.94, 293.66], // G
];
let synthTimer: ReturnType<typeof setInterval> | null = null;
let synthMaster: GainNode | null = null;
let chordIdx = 0;

function playChord() {
  const c = getAudioContext();
  if (!c || !synthMaster) return;
  const now = c.currentTime;
  const dur = 8;
  const chord = CHORDS[chordIdx++ % CHORDS.length];
  for (const f of chord) {
    for (const detune of [-6, 6]) {
      const o = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.05, now + 2.5);
      g.gain.linearRampToValueAtTime(0.0001, now + dur + 1.5);
      o.connect(lp);
      lp.connect(g);
      g.connect(synthMaster);
      o.start(now);
      o.stop(now + dur + 1.6);
    }
  }
}

function startSynth() {
  const c = getAudioContext();
  if (!c || synthTimer) return;
  synthMaster = c.createGain();
  synthMaster.gain.value = MUSIC_VOLUME;
  synthMaster.connect(c.destination);
  playChord();
  synthTimer = setInterval(playChord, 7000);
}

function stopSynth() {
  if (synthTimer) clearInterval(synthTimer);
  synthTimer = null;
  if (synthMaster) {
    try {
      synthMaster.disconnect();
    } catch {
      /* ignore */
    }
    synthMaster = null;
  }
}

// ---------- file based music ----------
function ensureEl() {
  if (el) return el;
  el = new Audio(url(MUSIC_FILE));
  el.loop = true;
  el.volume = MUSIC_VOLUME;
  el.preload = "auto";
  el.setAttribute("playsinline", "");
  el.addEventListener("error", () => {
    fileFailed = true;
    if (wantPlaying && enabled && document.visibilityState === "visible") startSynth();
  });
  return el;
}

function begin() {
  if (!enabled || !wantPlaying || document.visibilityState !== "visible") return;
  if (fileFailed) {
    startSynth();
    return;
  }
  const a = ensureEl();
  const p = a.play();
  if (p) {
    p.catch(() => {
      // Autoplay blocked (needs a gesture) or file unusable. The next gesture retries.
      if (fileFailed) startSynth();
    });
  }
}

function halt() {
  el?.pause();
  stopSynth();
}

function emit() {
  listeners.forEach((l) => l());
}

/** Call from a user gesture (pointerdown / touchend / click). Safe to call repeatedly. */
export function startMusic() {
  wantPlaying = true;
  // Only (re)start if not already playing.
  if (enabled && (!el || el.paused) && !synthTimer) begin();
}

export function isMusicEnabled() {
  return enabled;
}

export function setMusicEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  if (on) {
    wantPlaying = true;
    begin();
  } else {
    halt();
  }
  emit();
}

export function subscribeMusic(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Pause when the tab/app is hidden (important on mobile), resume when visible again.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") halt();
    else if (enabled && wantPlaying) begin();
  });
}
