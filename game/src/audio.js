// Synthesised sound only — WebAudio oscillators and noise, no audio files.
export function createAudio() {
  let ctx = null, master = null, muted = false, engineOsc = null, engineGain = null, sirenOsc = null;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      return true;
    } catch { return false; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* audio is best-effort */ }
  }
  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = low ? 'lowpass' : 'highpass'; f.frequency.value = low ? 900 : 1800;
      const g = ctx.createGain(); g.gain.value = vol || 0.25;
      src.connect(f); f.connect(g); g.connect(master); src.start();
    } catch { /* best-effort */ }
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    isMuted() { return muted; },
    blip() { tone(880, 0.09, 'sine', 0.18, 1320); },
    pickup() { tone(660, 0.08, 'sine', 0.2, 990); setTimeout(() => tone(990, 0.12, 'sine', 0.2, 1320), 70); },
    gunshot() { noise(0.14, 0.4, false); tone(160, 0.1, 'sawtooth', 0.2, 60); },
    punch() { noise(0.08, 0.3, true); },
    crash() { noise(0.25, 0.35, true); tone(90, 0.25, 'sawtooth', 0.2, 40); },
    siren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        try {
          sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle';
          const g = ctx.createGain(); g.gain.value = muted ? 0 : 0.05;
          const lfo = ctx.createOscillator(); lfo.frequency.value = 0.7;
          const lg = ctx.createGain(); lg.gain.value = 320;
          lfo.connect(lg); lg.connect(sirenOsc.frequency);
          sirenOsc.frequency.value = 800;
          sirenOsc.connect(g); g.connect(master);
          sirenOsc.start(); lfo.start(); sirenOsc._lfo = lfo; sirenOsc._g = g;
        } catch { sirenOsc = null; }
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); sirenOsc._lfo.stop(); } catch { /* ignore */ }
        sirenOsc = null;
      }
    },
    engine(speed01) {
      if (!ensure()) return;
      if (!engineOsc) {
        try {
          engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
          engineGain = ctx.createGain(); engineGain.gain.value = 0;
          const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
          engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
          engineOsc.start();
        } catch { engineOsc = null; }
      }
      if (engineOsc) {
        engineOsc.frequency.value = 55 + speed01 * 130;
        engineGain.gain.value = muted ? 0 : 0.03 + speed01 * 0.05;
      }
    },
    engineOff() { if (engineGain) engineGain.gain.value = 0; },
    winJingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.2), i * 130)); },
    loseJingle() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.18), i * 160)); },
  };
}
