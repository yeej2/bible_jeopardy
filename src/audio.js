const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = null;
let musicOscillators = [];
let musicGain = null;
let musicEnabled = false;
let musicInterval = null;

function getCtx() {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function beep(freq, duration, type = 'sine', volume = 0.1) {
  const context = getCtx();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, context.currentTime);
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
}

export function playBuzz() {
  beep(880, 0.15, 'square', 0.15);
  setTimeout(() => beep(1100, 0.25, 'square', 0.15), 80);
}

export function playCorrect() {
  beep(523, 0.12, 'sine', 0.12);
  setTimeout(() => beep(659, 0.12, 'sine', 0.12), 120);
  setTimeout(() => beep(784, 0.25, 'sine', 0.12), 240);
}

export function playWrong() {
  beep(150, 0.4, 'sawtooth', 0.12);
  setTimeout(() => beep(120, 0.5, 'sawtooth', 0.12), 150);
}

export function playTimerTick() {
  beep(1000, 0.05, 'sine', 0.05);
}

export function playDailyDouble() {
  beep(440, 0.15, 'square', 0.12);
  setTimeout(() => beep(440, 0.15, 'square', 0.12), 160);
  setTimeout(() => beep(880, 0.4, 'square', 0.12), 320);
}

function playMusicNote(freq, duration, volume = 0.05) {
  const context = getCtx();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, context.currentTime);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0.001, context.currentTime + duration - 0.05);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
  musicOscillators.push(osc);
}

export function startMusic() {
  if (musicEnabled || musicInterval) return;
  musicEnabled = true;
  const notes = [262, 330, 392, 523, 392, 330];
  let idx = 0;
  musicInterval = setInterval(() => {
    if (!musicEnabled) return;
    playMusicNote(notes[idx % notes.length], 0.4, 0.04);
    idx += 1;
  }, 450);
}

export function stopMusic() {
  musicEnabled = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  musicOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch (e) {}
  });
  musicOscillators = [];
}

export function toggleMusic() {
  if (musicEnabled) {
    stopMusic();
  } else {
    startMusic();
  }
  return musicEnabled;
}
