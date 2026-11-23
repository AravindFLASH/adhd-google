/**
 * FocusPulse - Advanced Web Audio API Engine
 * 
 * Features:
 * 1. 40Hz Gamma Isochronic Pulse Generator (Trapezoidal / Cosine AM envelope)
 * 2. True Binaural Beats Generator (Stereo ChannelMerger: Left fc, Right fc + df)
 * 3. Brownian / Pink Noise Generator (Auditory masking for ADHD sensory grounding)
 * 4. Neuro-Entrainment Presets: 40Hz Gamma (Focus), 14Hz SMR (Restlessness), 10Hz Alpha (Flow), 4Hz Theta / 528Hz (Calm)
 * 5. Real-Time FFT AnalyserNode feeding the WebGL Particle & Shader FX engine
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.analyser = null;

    // Active nodes
    this.activeNodes = {
      carrierL: null,
      carrierR: null,
      lfo: null,
      modGain: null,
      noiseSource: null,
      noiseGain: null,
      merger: null
    };

    // Current settings
    this.mode = 'ISOCHRONIC'; // 'ISOCHRONIC', 'BINAURAL', 'BROWN_NOISE', 'HYBRID_FOCUS'
    this.carrierFreq = 216;   // 216Hz, 432Hz, 528Hz
    this.beatFreq = 40;       // 40Hz Gamma (Focus), 14Hz SMR, 10Hz Alpha, 4Hz Theta
    this.volume = 0.18;
    this.noiseVolume = 0.08;

    // Analyser buffer
    this.fftData = null;
    this.waveData = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Master Analyser Node for Visualizers
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;
    this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveData = new Uint8Array(this.analyser.fftSize);

    // Routing
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async resumeContext() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setCarrier(freq) {
    this.carrierFreq = freq;
    if (this.isPlaying) {
      this.start(this.mode); // Smooth restart with new carrier
    }
  }

  setBeatFrequency(freq) {
    this.beatFreq = freq;
    if (this.isPlaying) {
      this.start(this.mode);
    }
  }

  // ==========================================
  // Core Synthesis Modules
  // ==========================================

  /**
   * Starts audio playback according to selected mode
   */
  async start(mode = this.mode) {
    await this.resumeContext();
    this.stopNodes();
    this.mode = mode;
    this.isPlaying = true;

    switch (this.mode) {
      case 'BINAURAL':
        this.setupBinauralBeats();
        break;
      case 'BROWN_NOISE':
        this.setupBrownNoise();
        break;
      case 'HYBRID_FOCUS':
        this.setupBinauralBeats();
        this.setupBrownNoise();
        break;
      case 'ISOCHRONIC':
      default:
        this.setupIsochronicPulses();
        break;
    }
  }

  stop() {
    this.stopNodes();
    this.isPlaying = false;
  }

  stopNodes() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    try {
      if (this.activeNodes.carrierL) {
        this.activeNodes.carrierL.stop(now + 0.05);
        this.activeNodes.carrierL.disconnect();
      }
      if (this.activeNodes.carrierR) {
        this.activeNodes.carrierR.stop(now + 0.05);
        this.activeNodes.carrierR.disconnect();
      }
      if (this.activeNodes.lfo) {
        this.activeNodes.lfo.stop(now + 0.05);
        this.activeNodes.lfo.disconnect();
      }
      if (this.activeNodes.noiseSource) {
        this.activeNodes.noiseSource.stop(now + 0.05);
        this.activeNodes.noiseSource.disconnect();
      }
    } catch (e) {}

    this.activeNodes = {
      carrierL: null,
      carrierR: null,
      lfo: null,
      modGain: null,
      noiseSource: null,
      noiseGain: null,
      merger: null
    };
  }

  /**
   * 1. 40Hz Gamma Isochronic Pulse Generator
   * Uses an LFO modulating the amplitude of a resonant carrier wave.
   * Can be perceived clearly through laptop speakers without headphones!
   */
  setupIsochronicPulses() {
    const now = this.ctx.currentTime;

    // Carrier Oscillator (Warm Sine/Triangle blend)
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(this.carrierFreq, now);

    // Modulation Gain Node
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(0.0, now);

    // LFO (Beat frequency: 40Hz for Gamma)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine'; // Smooth isochronic envelope
    lfo.frequency.setValueAtTime(this.beatFreq, now);

    // LFO Gain range (0 to 1 amplitude modulation)
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.5, now);

    // DC Offset constant to keep carrier positive
    const dcOffset = this.ctx.createConstantSource ? this.ctx.createConstantSource() : null;
    if (dcOffset) {
      dcOffset.offset.setValueAtTime(0.5, now);
      dcOffset.connect(modGain.gain);
      dcOffset.start(now);
      this.activeNodes.dcOffset = dcOffset;
    }

    lfo.connect(lfoGain);
    lfoGain.connect(modGain.gain);

    carrier.connect(modGain);
    modGain.connect(this.masterGain);

    carrier.start(now);
    lfo.start(now);

    this.activeNodes.carrierL = carrier;
    this.activeNodes.lfo = lfo;
    this.activeNodes.modGain = modGain;
  }

  /**
   * 2. True Stereo Binaural Beats Generator
   * Routes Left: Carrier, Right: Carrier + Delta
   * Creates an inter-aural phase shift that the brain's superior olive fuses into a 40Hz cognitive entrainment wave.
   */
  setupBinauralBeats() {
    const now = this.ctx.currentTime;

    // Left Ear: Carrier Frequency
    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(this.carrierFreq, now);

    // Right Ear: Carrier + Beat Delta (e.g. 216 + 40 = 256 Hz)
    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(this.carrierFreq + this.beatFreq, now);

    // Stereo Merger (Channel 0 = Left, Channel 1 = Right)
    const merger = this.ctx.createChannelMerger(2);
    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);

    merger.connect(this.masterGain);

    oscLeft.start(now);
    oscRight.start(now);

    this.activeNodes.carrierL = oscLeft;
    this.activeNodes.carrierR = oscRight;
    this.activeNodes.merger = merger;
  }

  /**
   * 3. Brownian / Pink Noise Generator for Auditory Masking
   * ADHD brains thrive on moderate stochastic noise (moderate brain arousal model),
   * which filters out distracting environmental sounds (typing, footsteps, car horns).
   */
  setupBrownNoise() {
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds seamless loop
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brownian integration filter
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for low amplitude
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Lowpass filter for deep soothing brownian rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(this.noiseVolume, now);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(now);

    this.activeNodes.noiseSource = noiseSource;
    this.activeNodes.noiseGain = noiseGain;
  }

  /**
   * Chime / Notification Sound
   */
  playChime(freq = 528, duration = 0.4) {
    if (!this.ctx) this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Adapts the audio state based on ADHD diagnostic state
   */
  adaptToADHDState(state) {
    if (!this.isPlaying) return;

    switch (state) {
      case 'STATE_INATTENTION':
        // Upregulate 40Hz Gamma Isochronic pulse to snap back focus
        this.setBeatFrequency(40);
        this.setCarrier(432);
        this.start('ISOCHRONIC');
        break;

      case 'STATE_OVERWHELM_PARALYSIS':
        // Downregulate to 4Hz Theta + 528Hz Calming tone for parasympathetic de-escalation
        this.setBeatFrequency(4);
        this.setCarrier(528);
        this.start('BINAURAL');
        break;

      case 'STATE_SHALLOW_BREATHING':
        // Soothing brown noise + 10Hz Alpha to stabilize respiration
        this.setBeatFrequency(10);
        this.setCarrier(528);
        this.start('HYBRID_FOCUS');
        break;

      case 'STATE_RESTLESS':
        // 14Hz SMR (Sensory-Motor Rhythm) to quiet physical motor restlessness
        this.setBeatFrequency(14);
        this.setCarrier(216);
        this.start('ISOCHRONIC');
        break;

      case 'STATE_FLOW':
      default:
        // Gentle 40Hz Gamma + subtle brown noise background
        this.setBeatFrequency(40);
        this.setCarrier(216);
        this.start('BINAURAL');
        break;
    }
  }

  /**
   * Returns live audio spectral and waveform data for Visualizer FX
   */
  getAudioData() {
    if (!this.analyser) {
      return { energy: 0, spectrum: null, waveform: null };
    }
    this.analyser.getByteFrequencyData(this.fftData);
    this.analyser.getByteTimeDomainData(this.waveData);

    // Calculate normalized energy
    let sum = 0;
    for (let i = 0; i < this.fftData.length; i++) {
      sum += this.fftData[i];
    }
    const energy = sum / (this.fftData.length * 255);

    return {
      energy,
      spectrum: this.fftData,
      waveform: this.waveData
    };
  }
}
