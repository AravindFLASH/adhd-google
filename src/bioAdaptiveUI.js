/**
 * FocusPulse - Bio-Adaptive UI & Intervention Controller
 * 
 * Manages:
 * 1. Web Audio Synthesizer (40Hz Gamma Focus Beats & 528Hz Calming Tones)
 * 2. Attention Pulse Peripheral Vignette
 * 3. Paced Breathing Biofeedback Orb (Box Breathing & Resonance Pacing)
 * 4. Micro-Task Chunking Interface ("Paralysis Buster")
 * 5. 60-Second Movement / Fidget Reset
 * 6. Real-Time Canvas Oscilloscopes (PPG & Respiration Waveforms)
 */

export class BioAdaptiveUI {
  constructor(options = {}) {
    this.options = options;
    this.audioContext = null;
    this.isAudioEnabled = false;
    this.currentOscillator = null;
    this.gainNode = null;

    // Breathing guide state
    this.breathingInterval = null;
    this.breathingPhaseIndex = 0;
    this.breathingPhases = [
      { name: 'Inhale', duration: 4, scale: 1.6, prompt: 'Inhale deep into belly (diaphragm expansion)' },
      { name: 'Hold', duration: 4, scale: 1.6, prompt: 'Hold gently, keep upper chest still' },
      { name: 'Exhale', duration: 4, scale: 0.85, prompt: 'Slowly release through mouth, relax belly' },
      { name: 'Hold', duration: 4, scale: 0.85, prompt: 'Rest in parasympathetic stillness' }
    ];

    // Movement timer state
    this.movementTimerInterval = null;
    this.movementSecondsLeft = 60;

    // Waveform canvas histories (Dual-Trace Respiration)
    this.ppgHistory = new Array(200).fill(0);
    this.thoracicHistory = new Array(200).fill(0);
    this.abdominalHistory = new Array(200).fill(0);

    // Initialize DOM handles
    this.initDOM();
  }

  initDOM() {
    this.vignette = document.getElementById('attention-vignette');
    this.dimmer = document.getElementById('sensory-dimmer');
    this.statePill = document.getElementById('state-pill');
    this.statePillText = document.getElementById('state-pill-text');
    this.stateTitle = document.getElementById('state-title');
    this.stateDescription = document.getElementById('state-description');
    this.stateIcon = document.getElementById('state-icon');

    // Intervention Panels
    this.breathingPanel = document.getElementById('breathing-panel');
    this.paralysisPanel = document.getElementById('paralysis-panel');
    this.movementPanel = document.getElementById('movement-panel');
    this.flowPanel = document.getElementById('flow-panel');

    // Gauges
    this.gaugeInattention = document.getElementById('gauge-inattention');
    this.gaugeOverwhelm = document.getElementById('gauge-overwhelm');
    this.gaugeRestless = document.getElementById('gauge-restless');
    this.gaugeBreathing = document.getElementById('gauge-breathing');

    this.valInattention = document.getElementById('val-inattention');
    this.valOverwhelm = document.getElementById('val-overwhelm');
    this.valRestless = document.getElementById('val-restless');
    this.valBreathing = document.getElementById('val-breathing');

    // Waveform Canvases
    this.ppgCanvas = document.getElementById('ppg-canvas');
    this.ppgCtx = this.ppgCanvas ? this.ppgCanvas.getContext('2d') : null;

    this.respCanvas = document.getElementById('resp-canvas');
    this.respCtx = this.respCanvas ? this.respCanvas.getContext('2d') : null;

    // Breathing Orb Elements
    this.breathingOrb = document.getElementById('breathing-orb');
    this.breathingPhaseText = document.getElementById('breathing-phase-text');
    this.breathingTimerText = document.getElementById('breathing-timer-text');

    // Timeline Log
    this.timelineContainer = document.getElementById('timeline-log');
  }

  // ==========================================
  // Web Audio Synthesizer (Neuro-Entrainment)
  // ==========================================

  initAudio() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  toggleAudio(enabled) {
    this.isAudioEnabled = enabled;
    if (enabled) {
      this.initAudio();
      this.playChime(440, 0.1);
    } else {
      this.stopContinuousTone();
    }
  }

  playContinuous40HzEntrainment() {
    if (this.options.audioEngine && this.options.audioEngine.isPlaying) {
      this.options.audioEngine.start('ISOCHRONIC');
      return;
    }
    if (!this.isAudioEnabled) return;
    this.initAudio();
    this.stopContinuousTone();

    // Carrier 200 Hz with 40 Hz amplitude modulation (Gamma Wave Entrainment)
    const carrier = this.audioContext.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(216, this.audioContext.currentTime);

    const modOsc = this.audioContext.createOscillator();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(40, this.audioContext.currentTime);

    const modGain = this.audioContext.createGain();
    modGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);

    const masterGain = this.audioContext.createGain();
    masterGain.gain.setValueAtTime(0.06, this.audioContext.currentTime); // Soft volume

    modOsc.connect(modGain);
    carrier.connect(masterGain);
    masterGain.connect(this.audioContext.destination);

    carrier.start();
    modOsc.start();

    this.currentOscillator = { carrier, modOsc, masterGain };
  }

  playCalmingTone() {
    if (this.options.audioEngine && this.options.audioEngine.isPlaying) {
      this.options.audioEngine.start('BINAURAL');
      return;
    }
    if (!this.isAudioEnabled) return;
    this.initAudio();
    this.stopContinuousTone();

    // 528 Hz soft healing tone
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, this.audioContext.currentTime);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    this.currentOscillator = { osc, gain };
  }

  stopContinuousTone() {
    if (this.options.audioEngine) {
      // Don't kill audio if user has master audio on
    }
    if (this.currentOscillator) {
      try {
        if (this.currentOscillator.carrier) this.currentOscillator.carrier.stop();
        if (this.currentOscillator.modOsc) this.currentOscillator.modOsc.stop();
        if (this.currentOscillator.osc) this.currentOscillator.osc.stop();
      } catch (e) {}
      this.currentOscillator = null;
    }
  }

  playChime(freq = 587.33, dur = 0.3) {
    if (this.options.audioEngine) {
      this.options.audioEngine.playChime(freq, dur);
      return;
    }
    if (!this.isAudioEnabled) return;
    this.initAudio();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + dur);
  }

  // ==========================================
  // Bio-Adaptive State Transitions
  // ==========================================

  applyState(event) {
    const { currentState, confidence, reason } = event;

    // Log to Timeline
    this.addTimelineEntry(currentState, reason);

    // Update Header State Pill
    this.updateStatePill(currentState, confidence);

    // Deactivate generic overlays by default
    this.vignette.classList.remove('active-pulse');
    this.dimmer.classList.remove('active');
    this.stopContinuousTone();

    // Hide all intervention cards first
    this.breathingPanel.style.display = 'none';
    this.paralysisPanel.style.display = 'none';
    this.movementPanel.style.display = 'none';
    this.flowPanel.style.display = 'none';
    this.stopBreathingGuide();
    this.stopMovementTimer();

    switch (currentState) {
      case 'STATE_INATTENTION':
        this.stateTitle.textContent = 'Focus Drift Detected';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '⚡';
        this.stateIcon.style.color = '#06b6d4';

        // Trigger ambient peripheral pulse (non-intrusive glow)
        this.vignette.classList.add('active-pulse');
        // Play 40Hz focus gamma pulse
        this.playContinuous40HzEntrainment();
        this.flowPanel.style.display = 'block';
        break;

      case 'STATE_OVERWHELM_PARALYSIS':
        this.stateTitle.textContent = 'Autonomic Freeze & Task Paralysis';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '🛡️';
        this.stateIcon.style.color = '#f59e0b';

        // Dim clutter, bring up micro-chunking assistant
        this.dimmer.classList.add('active');
        this.paralysisPanel.style.display = 'block';
        this.playCalmingTone();
        break;

      case 'STATE_SHALLOW_BREATHING':
        this.stateTitle.textContent = 'Clavicular Hyperventilation';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '🌊';
        this.stateIcon.style.color = '#38bdf8';

        // Launch Paced Breathing Guide
        this.breathingPanel.style.display = 'block';
        this.startBreathingGuide();
        break;

      case 'STATE_RESTLESS':
        this.stateTitle.textContent = 'Agitated Physical Restlessness';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '🏃';
        this.stateIcon.style.color = '#10b981';

        // Launch 60s Movement Break
        this.movementPanel.style.display = 'block';
        this.startMovementTimer();
        break;

      case 'STATE_FLOW_STIMMING':
        this.stateTitle.textContent = 'Flow State (Productive Stimming)';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '✨';
        this.stateIcon.style.color = '#818cf8';
        this.flowPanel.style.display = 'block';
        break;

      case 'STATE_BURNOUT':
        this.stateTitle.textContent = 'Cognitive Fatigue / Burnout';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '☕';
        this.stateIcon.style.color = '#f43f5e';
        this.dimmer.classList.add('active');
        this.movementPanel.style.display = 'block';
        this.startMovementTimer();
        break;

      case 'STATE_FLOW':
      default:
        this.stateTitle.textContent = 'Optimal Focus & Equilibrium';
        this.stateDescription.textContent = reason;
        this.stateIcon.innerHTML = '🎯';
        this.stateIcon.style.color = '#34d399';
        this.flowPanel.style.display = 'block';
        break;
    }
  }

  updateStatePill(state, confidence) {
    const map = {
      STATE_FLOW: { text: 'Balanced Flow', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
      STATE_FLOW_STIMMING: { text: 'Flow (Active Stimming)', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.3)' },
      STATE_INATTENTION: { text: 'Inattention Drift', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },
      STATE_OVERWHELM_PARALYSIS: { text: 'Task Paralysis / Freeze', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },
      STATE_SHALLOW_BREATHING: { text: 'Shallow Respiration', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.3)' },
      STATE_RESTLESS: { text: 'Restlessness', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' },
      STATE_BURNOUT: { text: 'Burnout / Fatigue', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.15)', border: 'rgba(225, 29, 72, 0.3)' }
    };
    const style = map[state] || map.STATE_FLOW;
    this.statePillText.textContent = style.text;
    this.statePill.style.color = style.color;
    this.statePill.style.backgroundColor = style.bg;
    this.statePill.style.borderColor = style.border;
  }

  // ==========================================
  // Paced Breathing Biofeedback Engine
  // ==========================================

  startBreathingGuide() {
    this.stopBreathingGuide();
    this.breathingPhaseIndex = 0;

    const stepPhase = () => {
      const current = this.breathingPhases[this.breathingPhaseIndex];
      if (this.breathingOrb) {
        this.breathingOrb.style.transform = `scale(${current.scale})`;
        this.breathingOrb.style.transition = `transform ${current.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
      }
      if (this.breathingPhaseText) {
        this.breathingPhaseText.textContent = current.name;
      }
      if (this.breathingTimerText) {
        this.breathingTimerText.textContent = current.prompt;
      }

      // Gentle subtle tone on phase transition
      this.playChime(current.name === 'Inhale' ? 440 : 330, 0.2);

      this.breathingPhaseIndex = (this.breathingPhaseIndex + 1) % this.breathingPhases.length;
      this.breathingInterval = setTimeout(stepPhase, current.duration * 1000);
    };

    stepPhase();
  }

  stopBreathingGuide() {
    if (this.breathingInterval) {
      clearTimeout(this.breathingInterval);
      this.breathingInterval = null;
    }
    if (this.breathingOrb) {
      this.breathingOrb.style.transform = 'scale(1)';
    }
  }

  // ==========================================
  // 60-Second Movement Break Engine
  // ==========================================

  startMovementTimer() {
    this.stopMovementTimer();
    this.movementSecondsLeft = 60;
    const timerElem = document.getElementById('movement-seconds');
    if (timerElem) timerElem.textContent = this.movementSecondsLeft;

    this.movementTimerInterval = setInterval(() => {
      this.movementSecondsLeft--;
      if (timerElem) timerElem.textContent = this.movementSecondsLeft;

      if (this.movementSecondsLeft <= 0) {
        this.stopMovementTimer();
        this.playChime(659, 0.6); // celebratory chime
        if (timerElem) timerElem.textContent = 'DONE! 🎉';
      }
    }, 1000);
  }

  stopMovementTimer() {
    if (this.movementTimerInterval) {
      clearInterval(this.movementTimerInterval);
      this.movementTimerInterval = null;
    }
  }

  // ==========================================
  // Diagnostic Gauges & Telemetry Visualizers
  // ==========================================

  updateIndices(indices) {
    if (this.valInattention) this.valInattention.textContent = `${indices.inattentionIndex}%`;
    if (this.gaugeInattention) {
      this.gaugeInattention.style.width = `${indices.inattentionIndex}%`;
      this.gaugeInattention.style.backgroundColor = indices.inattentionIndex > 50 ? '#06b6d4' : '#10b981';
    }

    if (this.valOverwhelm) this.valOverwhelm.textContent = `${indices.overwhelmIndex}%`;
    if (this.gaugeOverwhelm) {
      this.gaugeOverwhelm.style.width = `${indices.overwhelmIndex}%`;
      this.gaugeOverwhelm.style.backgroundColor = indices.overwhelmIndex > 50 ? '#f59e0b' : '#10b981';
    }

    if (this.valRestless) {
      this.valRestless.textContent = indices.isProductiveStimming ? 'Stimming ✨' : `${indices.restlessnessIndex}%`;
    }
    if (this.gaugeRestless) {
      this.gaugeRestless.style.width = `${indices.restlessnessIndex}%`;
      this.gaugeRestless.style.backgroundColor = indices.isProductiveStimming ? '#818cf8' : (indices.restlessnessIndex > 50 ? '#f43f5e' : '#10b981');
    }

    if (this.valBreathing) this.valBreathing.textContent = `${indices.respiratoryDistressIndex}%`;
    if (this.gaugeBreathing) {
      this.gaugeBreathing.style.width = `${indices.respiratoryDistressIndex}%`;
      this.gaugeBreathing.style.backgroundColor = indices.respiratoryDistressIndex > 50 ? '#38bdf8' : '#10b981';
    }
  }

  updateWaveforms(pulseWave, thoracicWave, abdominalWave, tar = 0.75, mode = 'DIAPHRAGMATIC') {
    this.ppgHistory.push(pulseWave);
    if (this.ppgHistory.length > 200) this.ppgHistory.shift();

    this.thoracicHistory.push(thoracicWave !== undefined ? thoracicWave : 0);
    if (this.thoracicHistory.length > 200) this.thoracicHistory.shift();

    this.abdominalHistory.push(abdominalWave !== undefined ? abdominalWave : 0);
    if (this.abdominalHistory.length > 200) this.abdominalHistory.shift();

    // Render PPG Waveform Canvas
    if (this.ppgCtx && this.ppgCanvas) {
      const ctx = this.ppgCtx;
      const w = this.ppgCanvas.width;
      const h = this.ppgCanvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.75;
      for (let i = 0; i < this.ppgHistory.length; i++) {
        const x = (i / (this.ppgHistory.length - 1)) * w;
        const normY = (this.ppgHistory[i] + 1) / 2; // -1..1 to 0..1
        const y = h - (normY * (h - 10) + 5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Render Dual-Trace Respiration Waveform Canvas
    if (this.respCtx && this.respCanvas) {
      const ctx = this.respCtx;
      const w = this.respCanvas.width;
      const h = this.respCanvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle midline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Trace 1: Upper Chest (Thoracic/Clavicular) in Sky/Cyan
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < this.thoracicHistory.length; i++) {
        const x = (i / (this.thoracicHistory.length - 1)) * w;
        const normY = (this.thoracicHistory[i] + 1.8) / 3.6;
        const y = h - (normY * (h - 14) + 7);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Trace 2: Lower Abdomen (Diaphragmatic) in Emerald
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < this.abdominalHistory.length; i++) {
        const x = (i / (this.abdominalHistory.length - 1)) * w;
        const normY = (this.abdominalHistory[i] + 1.8) / 3.6;
        const y = h - (normY * (h - 14) + 7);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Legend & Mode Badge
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('● Upper Chest', 8, 14);

      ctx.fillStyle = '#10b981';
      ctx.fillText('● Lower Abdomen', 85, 14);

      // TAR & Mode
      const isClavicular = mode === 'CLAVICULAR';
      ctx.fillStyle = isClavicular ? '#f59e0b' : '#34d399';
      ctx.fillText(`${mode} (TAR: ${tar})`, w - 120, 14);
    }
  }

  addTimelineEntry(state, description) {
    if (!this.timelineContainer) return;
    const item = document.createElement('div');
    const now = new Date().toLocaleTimeString();

    let typeClass = '';
    if (state.includes('OVERWHELM') || state.includes('BURNOUT')) typeClass = 'danger';
    else if (state.includes('INATTENTION') || state.includes('RESTLESS') || state.includes('BREATHING')) typeClass = 'warning';

    item.className = `timeline-item ${typeClass}`;
    item.innerHTML = `
      <span><strong>${state.replace('STATE_', '')}:</strong> ${description.slice(0, 50)}...</span>
      <span class="timeline-time">${now}</span>
    `;

    this.timelineContainer.insertBefore(item, this.timelineContainer.firstChild);

    // Keep max 15 entries
    while (this.timelineContainer.children.length > 15) {
      this.timelineContainer.removeChild(this.timelineContainer.lastChild);
    }
  }
}
