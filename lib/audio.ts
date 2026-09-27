/** Simple browser-native synthetic audio via the Web Audio API. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Unlock audio on first user gesture (browser autoplay policies). */
export function primeAudio(): void {
  getCtx();
}

function tone(freq: number, durationMs: number, type: OscillatorType): void {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = audio.currentTime;
  const dur = durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/** High-pitched beep for correct responses. */
export function beepCorrect(): void {
  tone(880, 120, 'sine');
}

/** Low-pitched boop for incorrect responses. */
export function beepIncorrect(): void {
  tone(180, 220, 'square');
}

/** Session start cue. */
export function beepStart(): void {
  tone(520, 200, 'triangle');
}

/** Session end cue (descending pair). */
export function beepEnd(): void {
  tone(440, 150, 'triangle');
  window.setTimeout(() => tone(330, 250, 'triangle'), 160);
}
