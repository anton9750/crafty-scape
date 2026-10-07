import { DRAG_SOUND_FILES, DRAG_VOLUME } from "@/config/audio";

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  return getCtx();
}

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  getCtx();
  void loadDragBuffers();
}

// ---- drag sounds: 10 files from public/assets/sounds, random order ----
const dragBuffers: (AudioBuffer | null)[] = DRAG_SOUND_FILES.map(() => null);
let dragLoading = false;
let bag: number[] = [];
let lastPlayed = -1;

const assetUrl = (p: string) => `${import.meta.env.BASE_URL}${p}`.replace(/\/{2,}/g, "/");

async function loadDragBuffers() {
  const c = getCtx();
  if (!c || dragLoading) return;
  dragLoading = true;
  await Promise.all(
    DRAG_SOUND_FILES.map(async (file, i) => {
      try {
        const res = await fetch(assetUrl(file));
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || type.includes("text/html")) return; // missing file -> keep fallback
        const data = await res.arrayBuffer();
        dragBuffers[i] = await c.decodeAudioData(data);
      } catch {
        /* missing or undecodable: fallback beep is used for this slot */
      }
    }),
  );
}

// Shuffle-bag: every sound plays once (random order) before any repeats.
function nextDragIndex(): number {
  if (bag.length === 0) {
    bag = DRAG_SOUND_FILES.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag.length > 1 && bag[bag.length - 1] === lastPlayed) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
  }
  lastPlayed = bag.pop()!;
  return lastPlayed;
}

function beep(
  type: OscillatorType,
  freq: number,
  duration: number,
  gain = 0.16,
  slide?: number,
) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), now + duration);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  o.connect(g);
  g.connect(c.destination);
  o.start(now);
  o.stop(now + duration + 0.02);
}

export function playDragSound() {
  const c = getCtx();
  const idx = nextDragIndex();
  const buf = dragBuffers[idx];
  if (c && buf) {
    const src = c.createBufferSource();
    const g = c.createGain();
    g.gain.value = DRAG_VOLUME;
    src.buffer = buf;
    src.connect(g);
    g.connect(c.destination);
    src.start();
    return;
  }
  beep("sine", 420, 0.1, 0.12, 180);
}

export function playTransformSound() {
  beep("triangle", 523.25, 0.55, 0.2, 784);
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(1046.5, now + 0.08);
  o.frequency.exponentialRampToValueAtTime(1568, now + 0.35);
  g.gain.setValueAtTime(0.1, now + 0.08);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  o.connect(g);
  g.connect(c.destination);
  o.start(now + 0.08);
  o.stop(now + 0.5);
}

export function playFailSound() {
  beep("square", 220, 0.18, 0.08, 90);
}

export function playPlaceSound() {
  beep("sine", 660, 0.09, 0.1, 440);
}
