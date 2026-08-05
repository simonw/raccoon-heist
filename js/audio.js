// Procedural WebAudio: sneaky bass groove + sound effects. No audio assets needed.

let ctx = null;
let musicOn = true;
let master = null;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    startMusic();
  } catch (e) {
    ctx = null;
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function env(gainNode, t, attack, decay, peak = 1) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.linearRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function blip(freq, t, dur, type = 'sine', vol = 0.3, slide = 0) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  env(g, t, 0.008, dur, vol);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noiseBurst(t, dur, vol = 0.2, freq = 1200) {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = ctx.createGain();
  env(g, t, 0.005, dur, vol);
  src.connect(f).connect(g).connect(master);
  src.start(t); src.stop(t + dur + 0.05);
}

// ---------- Sound effects ----------
export const sfx = {
  coin()   { if (!ctx) return; const t = ctx.currentTime; blip(950, t, 0.09, 'square', 0.16); blip(1420, t + 0.07, 0.16, 'square', 0.16); },
  gem()    { if (!ctx) return; const t = ctx.currentTime; blip(660, t, 0.1, 'triangle', 0.22); blip(880, t + 0.08, 0.1, 'triangle', 0.22); blip(1320, t + 0.16, 0.2, 'triangle', 0.22); },
  munch()  { if (!ctx) return; const t = ctx.currentTime; noiseBurst(t, 0.08, 0.3, 500); noiseBurst(t + 0.1, 0.08, 0.25, 400); },
  bank()   { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => blip(f, t + i * 0.07, 0.18, 'triangle', 0.2)); },
  alert()  { if (!ctx) return; const t = ctx.currentTime; blip(600, t, 0.25, 'sawtooth', 0.12, 500); },
  caught() { if (!ctx) return; const t = ctx.currentTime; blip(400, t, 0.3, 'sawtooth', 0.2, -200); blip(300, t + 0.25, 0.4, 'sawtooth', 0.2, -180); noiseBurst(t, 0.3, 0.15, 300); },
  squawk() { if (!ctx) return; const t = ctx.currentTime; blip(1100, t, 0.12, 'sawtooth', 0.14, 500); blip(900, t + 0.14, 0.15, 'sawtooth', 0.13, -300); },
  frenzy() { if (!ctx) return; const t = ctx.currentTime; [440, 554, 659, 880, 1109].forEach((f, i) => blip(f, t + i * 0.05, 0.12, 'square', 0.14)); },
  dash()   { if (!ctx) return; noiseBurst(ctx.currentTime, 0.15, 0.18, 2000); },
  win()    { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => blip(f, t + i * 0.12, 0.25, 'triangle', 0.22)); },
  lose()   { if (!ctx) return; const t = ctx.currentTime; [392, 370, 349, 330].forEach((f, i) => blip(f, t + i * 0.22, 0.35, 'triangle', 0.2)); },
  meow()   { if (!ctx) return; const t = ctx.currentTime; blip(700, t, 0.25, 'sawtooth', 0.1, 250); },
  bark()   { if (!ctx) return; const t = ctx.currentTime; blip(220, t, 0.09, 'sawtooth', 0.25, 120); blip(190, t + 0.13, 0.11, 'sawtooth', 0.25, 90); noiseBurst(t, 0.07, 0.12, 700); },
};

// ---------- Sneaky bass groove ----------
// A little walking-bass jazz loop with brushed-hat noise. Scheduled bar by bar.
const BASS = [110, 0, 131, 110, 98, 0, 110, 131,  87, 0, 104, 87, 98, 0, 110, 98];
let step = 0, nextNoteTime = 0, schedTimer = null;
const TEMPO = 96;

function scheduleLoop() {
  if (!ctx || !musicOn) return;
  const stepDur = (60 / TEMPO) / 2; // eighth notes
  while (nextNoteTime < ctx.currentTime + 0.3) {
    const f = BASS[step % BASS.length];
    if (f) {
      const t = nextNoteTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      env(g, t, 0.01, stepDur * 0.9, 0.16);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + stepDur);
    }
    // brushed hats on off-beats
    if (step % 2 === 1) noiseBurst(nextNoteTime, 0.04, 0.03, 6000);
    step++;
    nextNoteTime += stepDur;
  }
  schedTimer = setTimeout(scheduleLoop, 120);
}

function startMusic() {
  if (!ctx) return;
  nextNoteTime = ctx.currentTime + 0.1;
  step = 0;
  scheduleLoop();
}

export function toggleMusic() {
  musicOn = !musicOn;
  if (musicOn && ctx) { nextNoteTime = ctx.currentTime + 0.1; scheduleLoop(); }
  else if (schedTimer) clearTimeout(schedTimer);
  return musicOn;
}
