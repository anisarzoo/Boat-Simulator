// 100% Procedural Web Audio API Sound Engine (No external sound files)
export class OceanAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.started = false;

    // Node references
    this.masterGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    this.waterGain = null;
    this.waterFilter = null;

    this.windGain = null;
    this.windFilter = null;
  }

  init() {
    if (this.started) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.initEngineSound();
    this.initWaterSound();
    this.initWindSound();

    this.started = true;
  }

  // Dual-oscillator marine diesel engine
  initEngineSound() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(90, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(42, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(42 * 1.5, this.ctx.currentTime);

    // Subtle tremolo for engine stroke cadence
    const tremolo = this.ctx.createOscillator();
    tremolo.frequency.setValueAtTime(7.5, this.ctx.currentTime);
    const tremoloGain = this.ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    tremolo.connect(tremoloGain);
    tremoloGain.connect(this.engineGain.gain);
    tremolo.start();

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  // Water rushing and hull displacement
  initWaterSound() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.waterFilter = this.ctx.createBiquadFilter();
    this.waterFilter.type = 'bandpass';
    this.waterFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.waterFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    whiteNoise.connect(this.waterFilter);
    this.waterFilter.connect(this.waterGain);
    this.waterGain.connect(this.masterGain);
    whiteNoise.start();
  }

  // Ocean breeze & storm gale wind
  initWindSound() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    // Pink noise approximation for deeper wind
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(240, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSource.start();
  }

  // Deep Ship Fog Horn (dual tone F2 & C3)
  playFogHorn() {
    if (!this.started || this.isMuted) return;

    const t = this.ctx.currentTime;
    const hornGain = this.ctx.createGain();
    hornGain.gain.setValueAtTime(0.0, t);
    hornGain.gain.linearRampToValueAtTime(0.5, t + 0.35); // Swell
    hornGain.gain.setValueAtTime(0.5, t + 2.4);
    hornGain.gain.exponentialRampToValueAtTime(0.001, t + 3.8); // Fade

    const freqs = [87.31, 130.81, 174.61]; // F2 harmonic chord
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);

      const fFilter = this.ctx.createBiquadFilter();
      fFilter.type = 'lowpass';
      fFilter.frequency.setValueAtTime(450, t);

      osc.connect(fFilter);
      fFilter.connect(hornGain);
      osc.start(t);
      osc.stop(t + 4.0);
    });

    hornGain.connect(this.masterGain);
  }

  // Distant AI vessel fog horn echo response
  playAIFogHorn(distanceMeters = 500) {
    if (!this.started || this.isMuted) return;

    const t = this.ctx.currentTime;
    const hornGain = this.ctx.createGain();
    const distFactor = THREE.MathUtils.clamp(1.0 - (distanceMeters / 1200.0), 0.15, 0.65);
    hornGain.gain.setValueAtTime(0.0, t);
    hornGain.gain.linearRampToValueAtTime(0.35 * distFactor, t + 0.6);
    hornGain.gain.setValueAtTime(0.35 * distFactor, t + 3.2);
    hornGain.gain.exponentialRampToValueAtTime(0.001, t + 5.2);

    // Deep container ship horn (low E1/B1 fundamental)
    const freqs = [55.0, 82.5, 110.0];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);

      const fFilter = this.ctx.createBiquadFilter();
      fFilter.type = 'lowpass';
      // Muffle high frequencies at distance
      fFilter.frequency.setValueAtTime(280 * distFactor + 120, t);

      osc.connect(fFilter);
      fFilter.connect(hornGain);
      osc.start(t);
      osc.stop(t + 5.5);
    });

    hornGain.connect(this.masterGain);
  }

  // Hydraulic/Electric Bow Thruster Water Jet Cavitation
  setBowThruster(active) {
    if (!this.started || this.isMuted) return;
    if (active) {
      if (!this.thrusterSource) {
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        this.thrusterSource = this.ctx.createBufferSource();
        this.thrusterSource.buffer = noiseBuffer;
        this.thrusterSource.loop = true;

        this.thrusterFilter = this.ctx.createBiquadFilter();
        this.thrusterFilter.type = 'bandpass';
        this.thrusterFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
        this.thrusterFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

        this.thrusterGain = this.ctx.createGain();
        this.thrusterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        this.thrusterGain.gain.linearRampToValueAtTime(0.22, this.ctx.currentTime + 0.2);

        this.thrusterSource.connect(this.thrusterFilter);
        this.thrusterFilter.connect(this.thrusterGain);
        this.thrusterGain.connect(this.masterGain);
        this.thrusterSource.start();
      }
    } else {
      if (this.thrusterSource && this.thrusterGain) {
        this.thrusterGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.25);
        setTimeout(() => {
          if (this.thrusterSource) {
            try { this.thrusterSource.stop(); } catch(e) {}
            this.thrusterSource = null;
          }
        }, 300);
      }
    }
  }

  // Shallow water depth sounder ping alarm
  playShallowPing() {
    if (!this.started || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Hydrodynamic wave crash / hull impact sound
  playWaveImpact(intensity = 1.0) {
    if (!this.started || this.isMuted) return;

    const t = this.ctx.currentTime;
    const impactGain = this.ctx.createGain();
    const vol = Math.min(0.35 * intensity, 0.45);
    impactGain.gain.setValueAtTime(vol, t);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.9);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }

    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer;

    src.connect(filter);
    filter.connect(impactGain);
    impactGain.connect(this.masterGain);
    src.start(t);
  }

  // COLREGs Rule 34(d): 5 short, rapid blasts on ship's whistle indicating doubt / immediate danger
  playDangerHorn(distanceMeters = 80) {
    if (!this.started || this.isMuted) return;

    const t = this.ctx.currentTime;
    const distFactor = THREE.MathUtils.clamp(1.0 - (distanceMeters / 600.0), 0.35, 1.0);
    const blastDuration = 0.22;
    const interval = 0.38;

    for (let i = 0; i < 5; i++) {
      const startTime = t + i * interval;
      const hornGain = this.ctx.createGain();
      hornGain.gain.setValueAtTime(0.0, startTime);
      hornGain.gain.linearRampToValueAtTime(0.42 * distFactor, startTime + 0.04);
      hornGain.gain.setValueAtTime(0.42 * distFactor, startTime + blastDuration - 0.04);
      hornGain.gain.exponentialRampToValueAtTime(0.001, startTime + blastDuration);

      const freqs = [115.0, 155.0, 230.0];
      freqs.forEach(f => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, startTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380 * distFactor + 180, startTime);

        osc.connect(filter);
        filter.connect(hornGain);
        osc.start(startTime);
        osc.stop(startTime + blastDuration + 0.02);
      });

      hornGain.connect(this.masterGain);
    }
  }

  // Heavy Ship-to-Ship Hull Impact / Metallic Collision Crunch
  playHeavyImpact(intensity = 1.0) {
    if (!this.started || this.isMuted) return;

    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    const vol = Math.min(0.65 * intensity, 0.85);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    // Deep sub-bass thud (hull displacement shockwave)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.8);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(vol * 0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.85);

    // Crushing metal & water slap noise
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(90, t + 1.6);
    filter.Q.setValueAtTime(2.0, t);

    const bufferSize = Math.floor(this.ctx.sampleRate * 1.6);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }

    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
  }

  toggleMute() {
    if (!this.started) {
      this.init();
      return false;
    }
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  update(dt, throttle, speedKnots, windKnots) {
    if (!this.started || this.isMuted) return;

    const t = this.ctx.currentTime;
    const absThrottle = Math.abs(throttle);
    const absSpeed = Math.abs(speedKnots);

    // 1. Dynamic diesel engine pitch & throttle rumble
    const targetFreq = 38 + absThrottle * 55 + absSpeed * 1.5;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq, t, 0.15);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, t, 0.15);

    const filterFreq = 80 + absThrottle * 260;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.2);

    const engineVol = 0.08 + absThrottle * 0.25;
    this.engineGain.gain.setTargetAtTime(engineVol, t, 0.1);

    // 2. Water hull rush
    const waterVol = Math.min(absSpeed * 0.025, 0.35);
    this.waterGain.gain.setTargetAtTime(waterVol, t, 0.2);
    this.waterFilter.frequency.setTargetAtTime(320 + absSpeed * 45, t, 0.2);

    // 3. Wind noise
    const windVol = 0.08 + (windKnots / 50.0) * 0.38;
    this.windGain.gain.setTargetAtTime(windVol, t, 0.4);
    this.windFilter.frequency.setTargetAtTime(180 + (windKnots / 50.0) * 600, t, 0.4);
  }
}
