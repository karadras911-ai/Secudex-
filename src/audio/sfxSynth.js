export function createSfxSynth(isMutedFn) {
  let ctx = null;
  let dryBus = null;
  let wetBus = null;
  let noiseBuf = null;
  let userGestureUnlocked = false;

  function unlockGesture() {
    userGestureUnlocked = true;
  }
  window.addEventListener('pointerdown', unlockGesture, { once: true, capture: true });
  window.addEventListener('keydown', unlockGesture, { once: true, capture: true });

  function ensure() {
    if (isMutedFn()) return null;
    if (!userGestureUnlocked && !navigator.userActivation?.hasBeenActive) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 3.5;

      const master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(comp);
      comp.connect(ctx.destination);

      dryBus = ctx.createGain();
      dryBus.gain.value = 0.78;
      dryBus.connect(master);

      const irLen = Math.floor(ctx.sampleRate * 0.95);
      const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const chData = irBuf.getChannelData(ch);
        for (let i = 0; i < irLen; i++) {
          const env = Math.pow(1 - i / irLen, 3.2);
          chData[i] = (Math.random() * 2 - 1) * env * 0.32;
        }
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = irBuf;
      const wetFilter = ctx.createBiquadFilter();
      wetFilter.type = 'lowpass';
      wetFilter.frequency.value = 2600;
      wetBus = ctx.createGain();
      wetBus.gain.value = 0.34;
      wetBus.connect(convolver);
      convolver.connect(wetFilter);
      wetFilter.connect(master);

      const len = Math.floor(ctx.sampleRate * 0.16);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.26));
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function routeVoice(node) {
    node.connect(dryBus);
    node.connect(wetBus);
  }

  function playGlassHarmonic(freq, startOffset, dur, peakGain, panVal = 0) {
    const c = ctx;
    const t0 = c.currentTime + startOffset;
    const carrier = c.createOscillator();
    const mod = c.createOscillator();
    const modGain = c.createGain();
    const env = c.createGain();
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t0);
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, t0);
    modGain.gain.setValueAtTime(freq * 0.22, t0);
    modGain.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.45);

    env.gain.setValueAtTime(0.0008, t0);
    env.gain.linearRampToValueAtTime(peakGain, t0 + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    if (pan) {
      pan.pan.value = panVal;
      env.connect(pan);
      routeVoice(pan);
    } else {
      routeVoice(env);
    }
    carrier.start(t0);
    mod.start(t0);
    carrier.stop(t0 + dur + 0.03);
    mod.stop(t0 + dur + 0.03);
  }

  function playContractBeamSound() {
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;

    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(76, now);
    sub.frequency.exponentialRampToValueAtTime(44, now + 1.35);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.28, now + 0.09);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
    sub.connect(subGain);
    subGain.connect(dryBus);
    sub.start(now);
    sub.stop(now + 1.95);

    const padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.Q.value = 1.8;
    padFilter.frequency.setValueAtTime(210, now);
    padFilter.frequency.exponentialRampToValueAtTime(1180, now + 1.15);
    padFilter.frequency.exponentialRampToValueAtTime(340, now + 2.6);
    routeVoice(padFilter);

    [146.83, 220.0, 329.63].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * 0.996, now);
      osc.frequency.linearRampToValueAtTime(freq, now + 1.4);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.12 : 0.08, now + 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.65);
      osc.connect(g);
      g.connect(padFilter);
      osc.start(now);
      osc.stop(now + 2.7);
    });

    playGlassHarmonic(880, 1.28, 0.95, 0.075, -0.18);
    playGlassHarmonic(1318.5, 1.36, 0.85, 0.055, 0.22);
  }

  function playPageFlipSound() {
    const c = ensure();
    if (!c || !noiseBuf) return;
    const now = c.currentTime;
    [0, 0.072].forEach((offset, k) => {
      const t0 = now + offset;
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1800 + k * 550, t0);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(5200, t0);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.11);
      src.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      routeVoice(gain);
      src.start(t0);
      src.stop(t0 + 0.13);
    });
    playGlassHarmonic(293.66, 0.01, 0.14, 0.032, 0);
  }

  function playScanSweepSound() {
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(360, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + 0.65);
    filter.frequency.exponentialRampToValueAtTime(420, now + 1.45);
    routeVoice(filter);

    [196.0, 293.66, 587.33].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(idx === 2 ? 0.045 : 0.075, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + 1.55);
    });
    playGlassHarmonic(1174.66, 0.02, 0.45, 0.048, -0.15);
  }

  function playDataTransferSound(isFlagship = false) {
    const c = ensure();
    if (!c) return;
    const notes = isFlagship
      ? [440.0, 659.25, 987.77, 1108.73]
      : [587.33, 880.0, 1318.51];
    notes.forEach((freq, i) => {
      const pan = (i % 2 === 0 ? -1 : 1) * 0.25;
      playGlassHarmonic(freq, i * 0.085, isFlagship ? 0.72 : 0.48, isFlagship ? 0.072 : 0.055, pan);
    });
  }

  return {
    unlockAudio: ensure,
    playContractBeamSound,
    playPageFlipSound,
    playScanSweepSound,
    playDataTransferSound,
  };
}
