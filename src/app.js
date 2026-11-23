/**
 * FocusPulse - Main Application Controller
 * Orchestrates SmartSpectraEngine, ADHDInterpreter, BioAdaptiveUI,
 * Web Audio Engine (40Hz Gamma & Binaural Beats), and WebGL Canvas Particle & Shader FX.
 */

import { SmartSpectraEngine } from './smartSpectraEngine.js';
import { ADHDInterpreter } from './adhdInterpreter.js';
import { BioAdaptiveUI } from './bioAdaptiveUI.js';
import { AudioEngine } from './audioEngine.js';
import { VisualizerFX } from './visualizerFX.js';

document.addEventListener('DOMContentLoaded', () => {
  let lastCameraStatus = null;
  let isStartingCamera = false;

  // 1. Initialize Advanced Web Audio Engine
  const audio = new AudioEngine();

  // 2. Initialize GPU Particle & Shader FX (WebGL Canvas)
  const fxCanvas = document.getElementById('fx-canvas');
  const visualizer = new VisualizerFX(fxCanvas);
  visualizer.start();

  // Mini Audio Spectrum Canvas
  const spectrumCanvas = document.getElementById('audio-spectrum-canvas');
  const spectrumCtx = spectrumCanvas ? spectrumCanvas.getContext('2d') : null;

  // 3. Initialize UI Controller
  const ui = new BioAdaptiveUI({ audioEngine: audio });

  // 4. Initialize ADHD Interpreter Engine
  const interpreter = new ADHDInterpreter({
    onStateChange: (stateEvent) => {
      // Synchronize audio engine with ADHD autonomic state
      audio.adaptToADHDState(stateEvent.currentState);
      ui.applyState(stateEvent);
    },
    onIndicesUpdate: (indices) => {
      ui.updateIndices(indices);
    },
    onCalibrationProgress: (progress, baseline) => {
      const calibText = document.getElementById('calibration-status-text');
      if (calibText) {
        if (progress < 100) {
          calibText.textContent = `Calibrating Baseline: ${progress}%`;
        } else {
          calibText.textContent = `Baseline Calibrated (HRV: ${baseline.rmssd}ms, Stress: ${baseline.baevsky})`;
        }
      }
    }
  });

  // Fast-track calibration for quick testing
  interpreter.calibrationDurationSec = 3;

  // 5. Initialize SmartSpectra SDK Engine
  const engine = new SmartSpectraEngine({
    onTelemetry: (payload) => {
      if (!engine.isLiveCamera) {
        setVitalsUnavailable(lastCameraStatus);
        return;
      }

      // Feed data to ADHD interpreter
      interpreter.processTelemetry(payload);

      // Update Live Vital Counters
      updateVitalDisplays(payload);

      // Update Waveform Oscilloscopes (Dual-Trace Respiration: Upper Chest vs Lower Abdomen)
      ui.updateWaveforms(
        payload.pulse.waveform,
        payload.respiration.thoracicWaveform,
        payload.respiration.abdominalWaveform,
        payload.respiration.tar,
        payload.respiration.mode
      );

      // Feed live vitals & audio FFT energy into WebGL Shader & Particle Engine
      const audioData = audio.getAudioData();
      visualizer.updateBioInputs(
        payload.pulse.waveform,
        payload.respiration.waveform,
        interpreter.currentState,
        audioData.energy
      );

      // Render Mini Audio Spectrum Bars
      if (spectrumCtx && spectrumCanvas && audioData.spectrum) {
        drawAudioSpectrum(spectrumCanvas, spectrumCtx, audioData.spectrum);
      }
    },
    onStatusChange: (status) => {
      lastCameraStatus = status;
      if (status.cameraActive !== undefined) {
        const camBtn = document.getElementById('btn-toggle-camera');
        const badge = document.getElementById('cam-mode-badge');
        if (camBtn) camBtn.classList.toggle('active', status.cameraActive);
        if (badge) {
          const errorLabel = status.error ? `CAMERA ERROR: ${status.errorCode || 'UnknownError'}` : 'SIMULATED SMARTSPECTRA STREAM';
          badge.textContent = status.cameraActive ? 'LIVE WEBCAM rPPG' : errorLabel;
          badge.className = status.cameraActive ? 'viewfinder-badge live-indicator' : 'viewfinder-badge';
          if (!status.cameraActive && status.error) {
            badge.style.color = '#ef4444';
            badge.title = status.error;
          } else {
            badge.style.color = '';
            badge.title = '';
          }
        }
      }
    }
  });

  // Start engine loop
  engine.start();

  // Check server-side Presage readiness on app boot and periodically.
  refreshPresageStatus();
  setInterval(refreshPresageStatus, 30000);

  // Initial dummy state trigger
  ui.applyState({
    currentState: 'STATE_FLOW',
    confidence: 0.95,
    reason: 'Initial resting equilibrium. Bio-adaptive sensors active.'
  });

  // ==========================================
  // 6. Wire Audio Engine Studio Controls
  // ==========================================

  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const audioStatusBadge = document.getElementById('audio-engine-status-badge');

  btnToggleAudio?.addEventListener('click', async () => {
    if (audio.isPlaying) {
      audio.stop();
      btnToggleAudio.classList.remove('active');
      btnToggleAudio.innerHTML = '<span>🔇</span> Audio Biofeedback OFF';
      if (audioStatusBadge) {
        audioStatusBadge.textContent = 'Muted';
        audioStatusBadge.style.color = '#94a3b8';
      }
    } else {
      await audio.start();
      btnToggleAudio.classList.add('active');
      btnToggleAudio.innerHTML = '<span class="audio-pulsing">🔊</span> Audio Biofeedback ON';
      if (audioStatusBadge) {
        audioStatusBadge.textContent = `Active ${audio.beatFreq}Hz`;
        audioStatusBadge.style.color = '#34d399';
      }
    }
  });

  // Mode Selection Pills
  const audioModeBtns = document.querySelectorAll('[data-audio-mode]');
  audioModeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      audioModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.audioMode;
      await audio.start(mode);
      if (!btnToggleAudio.classList.contains('active')) {
        btnToggleAudio.classList.add('active');
        btnToggleAudio.innerHTML = '<span class="audio-pulsing">🔊</span> Audio Biofeedback ON';
      }
    });
  });

  // Carrier Frequency Pills
  const carrierBtns = document.querySelectorAll('[data-carrier]');
  carrierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      carrierBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      audio.setCarrier(parseFloat(btn.dataset.carrier));
    });
  });

  // Target Beat Frequency Pills
  const beatBtns = document.querySelectorAll('[data-beat]');
  beatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      beatBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const freq = parseFloat(btn.dataset.beat);
      audio.setBeatFrequency(freq);
      if (audioStatusBadge) audioStatusBadge.textContent = `Active ${freq}Hz`;
    });
  });

  // Volume Slider
  const volumeSlider = document.getElementById('audio-volume-slider');
  volumeSlider?.addEventListener('input', (e) => {
    audio.setVolume(parseFloat(e.target.value));
  });

  // ==========================================
  // 7. Wire Visualizer FX Controls
  // ==========================================

  const topologyBtns = document.querySelectorAll('[data-topology]');
  topologyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      topologyBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      visualizer.setTopology(btn.dataset.topology);
    });
  });

  const sensitivitySlider = document.getElementById('fx-sensitivity-slider');
  sensitivitySlider?.addEventListener('input', (e) => {
    visualizer.sensitivity = parseFloat(e.target.value);
  });

  const btnEnterFocus = document.getElementById('btn-enter-fx-focus');
  const btnCloseFocus = document.getElementById('btn-close-fx-focus');

  btnEnterFocus?.addEventListener('click', () => {
    visualizer.setMode('FOCUS_VIEW');
    btnCloseFocus.style.display = 'block';
  });

  btnCloseFocus?.addEventListener('click', () => {
    visualizer.setMode('BACKGROUND');
    btnCloseFocus.style.display = 'none';
  });

  // ==========================================
  // 8. Wire General DOM Controls
  // ==========================================

  // Toggle Camera Feed
  const videoElem = document.getElementById('webcam-video');
  const canvasElem = document.getElementById('overlay-canvas');
  const btnToggleCamera = document.getElementById('btn-toggle-camera');

  async function startLiveCamera(source = 'manual') {
    if (isStartingCamera || engine.isLiveCamera) {
      return;
    }

    isStartingCamera = true;
    if (btnToggleCamera && source === 'manual') {
      btnToggleCamera.innerHTML = '<span>⏳</span> Connecting...';
    }

    try {
      await engine.startCamera(videoElem, canvasElem);
      if (engine.isLiveCamera) {
        btnToggleCamera?.classList.add('active');
        if (btnToggleCamera) {
          btnToggleCamera.innerHTML = '<span>📷</span> Live Camera Active';
        }
      } else if (btnToggleCamera) {
        const errorText = formatCameraError(lastCameraStatus);
        btnToggleCamera.innerHTML = `<span>⚠️</span> ${errorText}`;
      }
    } finally {
      isStartingCamera = false;
    }
  }

  btnToggleCamera?.addEventListener('click', async () => {
    if (isStartingCamera) {
      return;
    }

    if (engine.isLiveCamera) {
      engine.stopCamera();
      setVitalsUnavailable(lastCameraStatus);
      btnToggleCamera.classList.remove('active');
      btnToggleCamera.innerHTML = '<span>📷</span> Enable Camera rPPG';
    } else {
      await startLiveCamera('manual');
    }
  });

  // Safe auto-start: runs once, shares the same guarded camera-start flow.
  setTimeout(() => {
    startLiveCamera('auto');
  }, 700);

  // Optional: Connect BLE Smartwatch / Heart Rate Sensor via Web Bluetooth API
  const btnPairSmartwatch = document.getElementById('btn-pair-smartwatch');
  let bleDevice = null;
  let rrHistory = [];

  btnPairSmartwatch?.addEventListener('click', async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth API is not supported in this browser. Please use Google Chrome or Microsoft Edge on a supported OS.');
      return;
    }

    try {
      btnPairSmartwatch.innerHTML = '<span>⏳</span> Searching for Watch...';
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service']
      });

      bleDevice = device;
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      await characteristic.startNotifications();

      btnPairSmartwatch.classList.add('active');
      btnPairSmartwatch.innerHTML = `<span>⌚</span> ${device.name || 'Smartwatch'} Connected`;
      const badge = document.getElementById('cam-mode-badge');
      if (badge) badge.textContent = `HYBRID: SMARTSPECTRA + ${device.name || 'SMARTWATCH'} BLE`;

      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const is16Bit = (flags & 0x01) !== 0;
        const bpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
        let offset = is16Bit ? 3 : 2;

        engine.setManualOverride('bpm', bpm);

        const hasRR = (flags & 0x10) !== 0;
        if (hasRR) {
          while (offset + 1 < value.byteLength) {
            const rr = (value.getUint16(offset, true) / 1024) * 1000;
            rrHistory.push(rr);
            if (rrHistory.length > 20) rrHistory.shift();
            offset += 2;
          }

          if (rrHistory.length >= 4) {
            let diffSumSq = 0;
            for (let i = 0; i < rrHistory.length - 1; i++) {
              diffSumSq += Math.pow(rrHistory[i + 1] - rrHistory[i], 2);
            }
            const rmssd = Math.round(Math.sqrt(diffSumSq / (rrHistory.length - 1)));
            engine.setManualOverride('rmssd', rmssd);
            engine.setManualOverride('baevsky', Math.max(50, Math.round(420 - rmssd * 5.5)));
          }
        }
      });

      device.addEventListener('gattserverdisconnected', () => {
        btnPairSmartwatch.classList.remove('active');
        btnPairSmartwatch.innerHTML = '<span>⌚</span> Pair Smartwatch (Optional)';
        engine.clearManualOverrides();
      });

    } catch (err) {
      console.warn('Bluetooth pairing cancelled or failed:', err);
      btnPairSmartwatch.classList.remove('active');
      btnPairSmartwatch.innerHTML = '<span>⌚</span> Pair Smartwatch (Optional)';
    }
  });

  // Scenario Buttons
  const scenarioButtons = document.querySelectorAll('.btn-scenario');
  scenarioButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const scenarioKey = btn.dataset.scenario;
      engine.setScenario(scenarioKey);
    });
  });

  // Manual Biometric Sliders for Interactive Stress Testing
  const sliderBpm = document.getElementById('slider-bpm');
  const sliderRmssd = document.getElementById('slider-rmssd');
  const sliderRpm = document.getElementById('slider-rpm');
  const sliderMotion = document.getElementById('slider-motion');

  sliderBpm?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('slider-bpm-val').textContent = val;
    engine.setManualOverride('bpm', val);
  });

  sliderRmssd?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('slider-rmssd-val').textContent = val;
    engine.setManualOverride('rmssd', val);
    engine.setManualOverride('baevsky', Math.max(50, Math.round(450 - val * 6)));
  });

  sliderRpm?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('slider-rpm-val').textContent = val;
    engine.setManualOverride('rpm', val);
  });

  sliderMotion?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('slider-motion-val').textContent = val;
    engine.setManualOverride('motion', val);
  });

  document.getElementById('btn-reset-sliders')?.addEventListener('click', () => {
    engine.clearManualOverrides();
    if (sliderBpm) sliderBpm.value = 72;
    if (sliderRmssd) sliderRmssd.value = 55;
    if (sliderRpm) sliderRpm.value = 14;
    if (sliderMotion) sliderMotion.value = 4;
    document.getElementById('slider-bpm-val').textContent = '72';
    document.getElementById('slider-rmssd-val').textContent = '55';
    document.getElementById('slider-rpm-val').textContent = '14';
    document.getElementById('slider-motion-val').textContent = '4';
  });

  // Micro-Task Chunking Interface ("Paralysis Buster")
  const taskInput = document.getElementById('task-input');
  const btnChunkTask = document.getElementById('btn-chunk-task');
  const stepsContainer = document.getElementById('micro-steps-container');

  btnChunkTask?.addEventListener('click', () => {
    const taskText = taskInput.value.trim() || 'Complete demanding project report';
    generateMicroSteps(taskText, stepsContainer, ui, audio);
  });

  document.querySelectorAll('.task-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      taskInput.value = btn.dataset.task;
      generateMicroSteps(btn.dataset.task, stepsContainer, ui, audio);
    });
  });

  generateMicroSteps('Clear executive task block', stepsContainer, ui, audio);

  async function refreshPresageStatus() {
    const badge = document.getElementById('presage-status-badge');
    const text = document.getElementById('presage-status-text');
    const meta = document.getElementById('presage-status-meta');
    if (!badge || !text || !meta) return;

    badge.textContent = 'Checking...';
    badge.style.color = '#cbd5e1';

    try {
      const response = await fetch('/api/presage-status', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Status API returned ${response.status}`);
      }

      const status = await response.json();
      if (status.ok) {
        badge.textContent = 'Ready';
        badge.style.color = '#34d399';
        text.textContent = 'Presage configuration looks valid and server SDK is loadable.';
      } else {
        badge.textContent = 'Not Ready';
        badge.style.color = '#f59e0b';
        text.textContent = 'Presage data path is not fully configured yet. App is using synthetic/local telemetry.';
      }

      meta.textContent = `API key: ${status.hasApiKey ? 'set' : 'missing'} | SDK package: ${status.sdkInstalled ? 'available' : 'missing'}${status.sdkLoadError ? ` | load error: ${status.sdkLoadError}` : ''}`;
    } catch (err) {
      badge.textContent = 'Error';
      badge.style.color = '#ef4444';
      text.textContent = 'Failed to verify Presage status from server.';
      meta.textContent = err?.message || 'Unknown status error';
    }
  }
});

function formatCameraError(status) {
  if (!status || !status.errorCode) {
    return 'Camera Failed (Using Synthetic)';
  }

  const code = status.errorCode;
  if (code === 'NotAllowedError') {
    return 'Camera Permission Blocked';
  }
  if (code === 'NotFoundError' || code === 'DevicesNotFoundError') {
    return 'No Camera Device Found';
  }
  if (code === 'NotReadableError' || code === 'TrackStartError') {
    return 'Camera Busy in Another App';
  }
  if (code === 'InsecureContextError') {
    return 'Use HTTPS or localhost for Camera';
  }
  if (code === 'NotSupportedError') {
    return 'Browser Lacks getUserMedia Support';
  }

  return `Camera Failed (${code})`;
}

function setVitalsUnavailable(status) {
  const ids = [
    'val-pulse-bpm',
    'val-hrv-rmssd',
    'val-baevsky',
    'val-resp-rpm',
    'val-blink-rate',
    'val-motion-energy'
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '--';
  });

  const respModeElem = document.getElementById('val-resp-mode');
  if (respModeElem) {
    const reason = status?.errorCode ? `WAITING LIVE CAMERA (${status.errorCode})` : 'WAITING LIVE CAMERA';
    respModeElem.textContent = reason;
    respModeElem.style.color = '#f59e0b';
  }

  const sqiElem = document.getElementById('val-sqi-status');
  if (sqiElem) {
    sqiElem.textContent = 'NO LIVE SIGNAL';
    sqiElem.style.color = '#f59e0b';
  }
}

function updateVitalDisplays(payload) {
  const bpmElem = document.getElementById('val-pulse-bpm');
  const rmssdElem = document.getElementById('val-hrv-rmssd');
  const baevskyElem = document.getElementById('val-baevsky');
  const rpmElem = document.getElementById('val-resp-rpm');
  const blinksElem = document.getElementById('val-blink-rate');
  const motionElem = document.getElementById('val-motion-energy');
  const sqiElem = document.getElementById('val-sqi-status');

  if (bpmElem) bpmElem.textContent = payload.pulse.bpm;
  if (rmssdElem) rmssdElem.textContent = `${payload.pulse.rmssd} ms`;
  if (baevskyElem) baevskyElem.textContent = payload.pulse.baevsky;
  if (rpmElem) rpmElem.textContent = payload.respiration.rpm;
  const respModeElem = document.getElementById('val-resp-mode');
  if (respModeElem && payload.respiration.mode) {
    respModeElem.textContent = `${payload.respiration.mode} (TAR: ${payload.respiration.tar || '0.8'})`;
    respModeElem.style.color = payload.respiration.mode === 'DIAPHRAGMATIC' ? '#10b981' : (payload.respiration.mode === 'CLAVICULAR' ? '#f59e0b' : '#38bdf8');
  }
  if (blinksElem) blinksElem.textContent = payload.ocular.blinkRate;
  if (motionElem) motionElem.textContent = payload.motion.motionEnergy;
  if (sqiElem) {
    sqiElem.textContent = payload.pulse.sqi;
    sqiElem.style.color = payload.pulse.sqi.startsWith('HIGH') ? '#10b981' : '#f59e0b';
  }
}

function generateMicroSteps(taskTitle, container, ui, audio) {
  if (!container) return;

  const defaultStepDecomposition = [
    { num: 1, text: `Open the workspace & write 1 single bullet point for "${taskTitle}"`, est: '2 min' },
    { num: 2, text: `Gather 2 references or notes, do not write prose yet`, est: '3 min' },
    { num: 3, text: `Review Step 1 and outline next heading without judgment`, est: '5 min' }
  ];

  container.innerHTML = '';
  defaultStepDecomposition.forEach((step, index) => {
    const card = document.createElement('div');
    card.className = `micro-step-card ${index === 0 ? 'active-step' : ''}`;
    card.innerHTML = `
      <div class="step-badge">${step.num}</div>
      <div class="step-text">
        <strong>${step.text}</strong>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">Estimated: ${step.est}</div>
      </div>
      <button class="step-action-btn">${index === 0 ? 'Mark Complete ✓' : 'Upcoming'}</button>
    `;

    const actionBtn = card.querySelector('.step-action-btn');
    actionBtn?.addEventListener('click', () => {
      card.classList.remove('active-step');
      card.classList.add('completed-step');
      actionBtn.textContent = 'Completed ✓';
      actionBtn.disabled = true;
      audio.playChime(587.33, 0.4);

      // Activate next step
      const nextCard = container.children[index + 1];
      if (nextCard) {
        nextCard.classList.add('active-step');
        const nextBtn = nextCard.querySelector('.step-action-btn');
        if (nextBtn) nextBtn.textContent = 'Mark Complete ✓';
      }
    });

    container.appendChild(card);
  });
}

/**
 * Draws mini glowing frequency spectrum equalizer bars on Canvas
 */
function drawAudioSpectrum(canvas, ctx, spectrum) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const numBars = 32;
  const barWidth = (w / numBars) - 2;

  for (let i = 0; i < numBars; i++) {
    const val = spectrum[i * 2] || 0;
    const barHeight = (val / 255) * (h - 6);
    const x = i * (barWidth + 2);
    const y = h - barHeight;

    // Gradient cyan to indigo
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.9)');

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
}
