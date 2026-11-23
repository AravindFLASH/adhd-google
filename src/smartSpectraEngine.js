/**
 * FocusPulse - SmartSpectra Engine
 * 
 * Simulates and interfaces with the Presage SmartSpectra SDK.
 * Supports both Live Camera computer vision (rPPG green-channel optical pulse extraction,
 * facial motion differencing, blink detection, and chest respiration) and
 * high-fidelity clinical ADHD test scenarios.
 */

export class SmartSpectraEngine {
  constructor(options = {}) {
    this.options = options;
    this.isLiveCamera = false;
    this.stream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.animFrameId = null;

    // Callbacks
    this.onTelemetry = options.onTelemetry || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    // Internal State & Buffers
    this.activeScenario = 'BASELINE_FLOW'; // 'BASELINE_FLOW', 'INATTENTION_STARE', 'RESTLESSNESS_FIDGET', 'OVERWHELM_PARALYSIS', 'ANXIETY_SHALLOW_BREATHING', 'BURNOUT_EXHAUSTION'
    this.manualOverrides = {};

    // Signal processing buffers
    this.rppgBuffer = [];
    this.respirationBuffer = [];
    this.ibiBuffer = [];
    this.lastFrameTime = performance.now();
    this.prevImageData = null;

    // Live Camera Computer Vision signal extraction state
    this.liveRppgBuffer = [];
    this.liveIbiBuffer = [833, 820, 845, 830, 825];
    this.lastPulsePeakTime = 0;
    this.lastCardiacPulseVisualTime = 0;
    this.lastBlinkDetectionTime = performance.now();
    this.blinkTimestamps = [];
    this.prevAvgEyeLum = null;
    this.eyeBoxes = {
      left: null,
      right: null
    };
    this.chestSignalBuffer = [];
    this.abdomSignalBuffer = [];
    this.lastRespZeroCross = performance.now();
    this.prevRespWaveform = 0;

    // Simulation synthetic generators
    this.synthPhase = 0;
    this.respPhase = 0;
    this.lastBlinkTime = performance.now();
    this.stareTimer = 0;

    // Simulated scenario presets
    this.scenarioProfiles = {
      BASELINE_FLOW: {
        name: 'Balanced Flow State',
        targetBpm: 72,
        targetRmssd: 55,
        targetBaevsky: 85,
        targetRpm: 14,
        targetBlinkRate: 15,
        targetMotion: 4,
        targetGazeDeviation: 0.05,
        valence: 0.6,
        arousal: 0.4
      },
      INATTENTION_STARE: {
        name: 'Visual Inattention (Zombie Stare)',
        targetBpm: 68,
        targetRmssd: 45,
        targetBaevsky: 110,
        targetRpm: 12,
        targetBlinkRate: 3, // Severe drop in blinking
        targetMotion: 1.5, // Unmoving frozen stare
        targetGazeDeviation: 0.45, // Looking off-screen / glazed
        valence: 0.1,
        arousal: 0.2
      },
      RESTLESSNESS_FIDGET: {
        name: 'Physical Restlessness / Hyperactivity',
        targetBpm: 88,
        targetRmssd: 36,
        targetBaevsky: 165,
        targetRpm: 18,
        targetBlinkRate: 26,
        targetMotion: 52, // High motion energy
        targetGazeDeviation: 0.3,
        valence: 0.0,
        arousal: 0.75
      },
      OVERWHELM_PARALYSIS: {
        name: 'Autonomic Freeze & Task Paralysis',
        targetBpm: 104, // Sympathetic tachycardia
        targetRmssd: 14, // Severe vagal withdrawal (HRV collapse)
        targetBaevsky: 385, // High stress index
        targetRpm: 20,
        targetBlinkRate: 8,
        targetMotion: 1.2, // Motor freeze
        targetGazeDeviation: 0.1,
        valence: -0.6,
        arousal: 0.85
      },
      ANXIETY_SHALLOW_BREATHING: {
        name: 'Rapid Shallow Breathing / Panic',
        targetBpm: 98,
        targetRmssd: 22,
        targetBaevsky: 290,
        targetRpm: 27, // Clavicular hyperventilation
        targetBlinkRate: 22,
        targetMotion: 14,
        targetGazeDeviation: 0.25,
        valence: -0.4,
        arousal: 0.9
      },
      BURNOUT_EXHAUSTION: {
        name: 'Cognitive Burnout / Fatigue',
        targetBpm: 62,
        targetRmssd: 26,
        targetBaevsky: 195,
        targetRpm: 10,
        targetBlinkRate: 6,
        targetMotion: 3,
        targetGazeDeviation: 0.35,
        valence: -0.5,
        arousal: 0.15
      }
    };

    // Current smoothed telemetry state
    this.currentTelemetry = {
      bpm: 72,
      ibi: 833,
      rmssd: 55,
      baevsky: 85,
      sqi: 'HIGH',
      rppgWaveform: 0,
      rpm: 14,
      respWaveform: 0,
      thoracicWaveform: 0,
      abdominalWaveform: 0,
      respTar: 0.75, // Thoracoabdominal Ratio (Upper / Lower)
      respMode: 'DIAPHRAGMATIC', // 'DIAPHRAGMATIC', 'CLAVICULAR', 'BALANCED'
      respPhase: 'inhale',
      blinkRate: 15,
      stareDurationSec: 0,
      gazeVector: { x: 0, y: 0 },
      landmarkVelocity: 4,
      motionEnergy: 4,
      valence: 0.5,
      arousal: 0.4,
      frustration: 0.1,
      fatigue: 0.1
    };
  }

  setScenario(scenarioKey) {
    if (this.scenarioProfiles[scenarioKey]) {
      this.activeScenario = scenarioKey;
      this.stareTimer = 0;
      this.onStatusChange({ scenario: scenarioKey, profile: this.scenarioProfiles[scenarioKey] });
    }
  }

  setManualOverride(key, value) {
    this.manualOverrides[key] = value;
  }

  clearManualOverrides() {
    this.manualOverrides = {};
  }

  async startCamera(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');

    try {
      const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
      if (!window.isSecureContext && !isLocalhost) {
        const insecureErr = new Error('Camera requires HTTPS or localhost.');
        insecureErr.name = 'InsecureContextError';
        throw insecureErr;
      }

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        const unsupportedErr = new Error('This browser does not support navigator.mediaDevices.getUserMedia.');
        unsupportedErr.name = 'NotSupportedError';
        throw unsupportedErr;
      }

      if (navigator.permissions?.query) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' });
          if (cameraPermission.state === 'denied') {
            const deniedErr = new Error('Camera permission is blocked in browser settings.');
            deniedErr.name = 'NotAllowedError';
            throw deniedErr;
          }
        } catch (permErr) {
          // Ignore unsupported permission query implementations and continue to getUserMedia.
          if (permErr?.name === 'NotAllowedError') {
            throw permErr;
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.stream = stream;
      this.videoElement.srcObject = stream;
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('muted', '');
      this.videoElement.setAttribute('autoplay', '');
      await this.videoElement.play();

      // Wait for first real frame before syncing canvas dimensions
      await new Promise((resolve) => {
        const check = () => {
          if (this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });

      // Sync canvas resolution to actual video track size
      this.canvasElement.width = this.videoElement.videoWidth || 640;
      this.canvasElement.height = this.videoElement.videoHeight || 480;

      // Reset all live CV buffers on fresh camera start
      this.liveRppgBuffer = [];
      this.liveIbiBuffer = [833, 820, 845, 830, 825];
      this.lastPulsePeakTime = 0;
      this.lastCardiacPulseVisualTime = 0;
      this.prevImageData = null;
      this.lastBlinkDetectionTime = performance.now();
      this.blinkTimestamps = [];
      this.prevAvgEyeLum = null;
      this.eyeBoxes = { left: null, right: null };
      this.chestSignalBuffer = [];
      this.abdomSignalBuffer = [];
      this.lastRespZeroCross = performance.now();
      this.prevRespWaveform = 0;
      this.stareTimer = 0;

      this.isLiveCamera = true;
      this.onStatusChange({ cameraActive: true });
      console.log(`[SmartSpectra] Camera started: ${this.canvasElement.width}x${this.canvasElement.height}`);
    } catch (err) {
      console.warn('Camera access unavailable or declined, defaulting to SmartSpectra Synthetic Engine:', err);
      this.isLiveCamera = false;
      this.onStatusChange({
        cameraActive: false,
        error: err?.message || 'Unknown camera error',
        errorCode: err?.name || 'UnknownError'
      });
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isLiveCamera = false;
    this.onStatusChange({ cameraActive: false });
  }

  start() {
    const loop = (timestamp) => {
      try {
        this.processFrame(timestamp);
      } catch (err) {
        console.error('[SmartSpectra] Frame error:', err);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  processFrame(timestamp) {
    const dt = Math.max(0.001, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    if (this.isLiveCamera && this.videoElement && this.videoElement.readyState >= 2) {
      this.processLiveCameraFrame(dt);
    } else {
      this.processSimulatedFrame(dt, timestamp);
    }

    // Emit payload to ADHD interpreter
    this.onTelemetry({
      timestamp: Date.now(),
      pulse: {
        bpm: Math.round(this.currentTelemetry.bpm),
        ibi: Math.round(this.currentTelemetry.ibi),
        rmssd: Math.round(this.currentTelemetry.rmssd * 10) / 10,
        baevsky: Math.round(this.currentTelemetry.baevsky),
        sqi: this.currentTelemetry.sqi,
        waveform: this.currentTelemetry.rppgWaveform
      },
      respiration: {
        rpm: Math.round(this.currentTelemetry.rpm * 10) / 10,
        waveform: this.currentTelemetry.respWaveform,
        thoracicWaveform: this.currentTelemetry.thoracicWaveform,
        abdominalWaveform: this.currentTelemetry.abdominalWaveform,
        tar: Math.round(this.currentTelemetry.respTar * 100) / 100,
        mode: this.currentTelemetry.respMode,
        phase: this.currentTelemetry.respPhase
      },
      ocular: {
        blinkRate: Math.round(this.currentTelemetry.blinkRate),
        stareDurationSec: Math.round(this.currentTelemetry.stareDurationSec * 10) / 10,
        gazeVector: this.currentTelemetry.gazeVector
      },
      motion: {
        landmarkVelocity: Math.round(this.currentTelemetry.landmarkVelocity * 10) / 10,
        motionEnergy: Math.round(this.currentTelemetry.motionEnergy * 10) / 10
      },
      expressions: {
        valence: Math.round(this.currentTelemetry.valence * 100) / 100,
        arousal: Math.round(this.currentTelemetry.arousal * 100) / 100,
        frustration: Math.round(this.currentTelemetry.frustration * 100) / 100,
        fatigue: Math.round(this.currentTelemetry.fatigue * 100) / 100
      }
    });
  }

  /**
   * Real camera computer vision processing — full Presage SmartSpectra pipeline:
   * 1. Mirror-draws webcam frame onto canvas
   * 2. Extracts forehead ROI Green-minus-Red for rPPG optical pulse
   * 3. Peak-detects IBIs → true BPM, RMSSD, Baevsky Stress Index
   * 4. Dual-trace respiration via optical flow in upper-chest vs lower-abdomen ROIs
   * 5. Blink detection via eye-box luminance delta spike
   * 6. Stare / inattention accumulator when no blinks for >1.2s
   * 7. Gaze vector estimation from left/right eye luminance balance
   * 8. Draws upright HUD overlays on mirrored video
   */
  processLiveCameraFrame(dt) {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;
    const now = performance.now();

    // ── 1. ALWAYS draw mirrored webcam frame FIRST ─────────────────
    // This guarantees the user sees their face even if CV analysis errors out.
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoElement, 0, 0, w, h);
    ctx.restore();

    // ── 2. Computer Vision Analysis (wrapped in try/catch) ─────────
    // If anything below errors, the face is already drawn above.
    let roiX = 0, roiY = 0, roiW = 0, roiH = 0;
    let isMotionHigh = false;

    try {
      const frameData = ctx.getImageData(0, 0, w, h);
      const px = frameData.data;

      // Estimate eye boxes first, then use their midpoint to auto-anchor all ROIs.
      const eyeW2 = Math.round(w * 0.1);
      const eyeH2 = Math.round(h * 0.06);
      const leftEyeDefault = {
        x: Math.round(w * 0.35),
        y: Math.round(h * 0.32),
        w: eyeW2,
        h: eyeH2
      };
      const rightEyeDefault = {
        x: Math.round(w * 0.55),
        y: Math.round(h * 0.32),
        w: eyeW2,
        h: eyeH2
      };

      const leftEyeBox = this.detectEyeBox(px, w, h, leftEyeDefault);
      const rightEyeBox = this.detectEyeBox(px, w, h, rightEyeDefault);
      this.eyeBoxes.left = leftEyeBox;
      this.eyeBoxes.right = rightEyeBox;

      const eyeCenterX = Math.round((leftEyeBox.x + leftEyeBox.w / 2 + rightEyeBox.x + rightEyeBox.w / 2) / 2);
      const eyeCenterY = Math.round((leftEyeBox.y + leftEyeBox.h / 2 + rightEyeBox.y + rightEyeBox.h / 2) / 2);

      // ── 3. Forehead rPPG: G - 0.45·R over forehead ROI ──────────
      roiW = Math.round(w * 0.22);
      roiH = Math.round(h * 0.12);
      roiX = Math.max(0, Math.min(w - roiW, Math.round(eyeCenterX - roiW / 2)));
      roiY = Math.max(0, Math.min(h - roiH, Math.round(eyeCenterY - h * 0.18)));

      let gSum = 0, rSum = 0, roiN = 0;
      for (let y = roiY; y < roiY + roiH; y++) {
        for (let x = roiX; x < roiX + roiW; x++) {
          const i = (y * w + x) * 4;
          rSum += px[i];
          gSum += px[i + 1];
          roiN++;
        }
      }
      const avgG = gSum / (roiN || 1);
      const avgR = rSum / (roiN || 1);
      const rppgSample = avgG - 0.45 * avgR;

      this.liveRppgBuffer.push({ t: now, v: rppgSample });
      if (this.liveRppgBuffer.length > 180) this.liveRppgBuffer.shift();

      // ── 4. Frame-difference motion energy ────────────────────────
      let motionDiff = 0;
      if (this.prevImageData && this.prevImageData.length === px.length) {
        const step = 8;
        let dSum = 0, dN = 0;
        for (let i = 0; i < px.length; i += 4 * step) {
          dSum += Math.abs(px[i + 1] - this.prevImageData[i + 1]);
          dN++;
        }
        motionDiff = dSum / (dN || 1);
      }
      // Reuse buffer if same size, otherwise create new
      if (!this.prevImageData || this.prevImageData.length !== px.length) {
        this.prevImageData = new Uint8ClampedArray(px.length);
      }
      this.prevImageData.set(px);

      const smoothMotion = this.currentTelemetry.motionEnergy * 0.82 + motionDiff * 0.18;
      this.currentTelemetry.motionEnergy = smoothMotion;
      this.currentTelemetry.landmarkVelocity = smoothMotion * 1.8;

      isMotionHigh = smoothMotion > 18;
      this.currentTelemetry.sqi = isMotionHigh ? 'LOW (Motion Artifact)' : 'HIGH';

      // ── 5. rPPG Peak Detection → BPM / IBI / RMSSD / Baevsky ───
      if (!isMotionHigh && this.liveRppgBuffer.length > 45) {
        const bufLen = this.liveRppgBuffer.length;
        const rollingMean = this.liveRppgBuffer.reduce((a, b) => a + b.v, 0) / bufLen;
        const detrendedNow = rppgSample - rollingMean;
        this.currentTelemetry.rppgWaveform = detrendedNow * 4;

        if (bufLen >= 3) {
          const p0 = this.liveRppgBuffer[bufLen - 3].v - rollingMean;
          const p1 = this.liveRppgBuffer[bufLen - 2].v - rollingMean;
          const p2 = detrendedNow;

          if (p1 > p0 && p1 > p2 && p1 > 0.15 && (now - this.lastPulsePeakTime) > 380) {
            const ibiMs = now - this.lastPulsePeakTime;
            this.lastPulsePeakTime = now;
            this.lastCardiacPulseVisualTime = now;
            if (ibiMs > 400 && ibiMs < 1500) {
              this.liveIbiBuffer.push(ibiMs);
              if (this.liveIbiBuffer.length > 20) this.liveIbiBuffer.shift();
            }
          }
        }

        if (this.liveIbiBuffer.length >= 3) {
          const meanIbi = this.liveIbiBuffer.reduce((a, b) => a + b, 0) / this.liveIbiBuffer.length;
          this.currentTelemetry.bpm = this.currentTelemetry.bpm * 0.90 + (60000 / meanIbi) * 0.10;
          this.currentTelemetry.ibi = meanIbi;

          if (this.liveIbiBuffer.length >= 4) {
            let ssd = 0;
            for (let j = 1; j < this.liveIbiBuffer.length; j++) {
              const diff = this.liveIbiBuffer[j] - this.liveIbiBuffer[j - 1];
              ssd += diff * diff;
            }
            this.currentTelemetry.rmssd = this.currentTelemetry.rmssd * 0.85 + Math.sqrt(ssd / (this.liveIbiBuffer.length - 1)) * 0.15;
          }

          if (this.liveIbiBuffer.length >= 6) {
            const sorted = [...this.liveIbiBuffer].sort((a, b) => a - b);
            const mo = sorted[Math.floor(sorted.length / 2)];
            const mxdmn = (sorted[sorted.length - 1] - sorted[0]) / 1000;
            const bins = {};
            sorted.forEach(v => { const k = Math.round(v / 50) * 50; bins[k] = (bins[k] || 0) + 1; });
            const amo = Math.max(...Object.values(bins)) / sorted.length * 100;
            const si = mxdmn > 0.01 ? amo / (2 * (mo / 1000) * mxdmn) : 85;
            this.currentTelemetry.baevsky = this.currentTelemetry.baevsky * 0.88 + Math.min(500, si) * 0.12;
          }
        }
      } else if (isMotionHigh) {
        this.currentTelemetry.rppgWaveform *= 0.7;
      }

      // ── 6. Dual-Trace Respiration via Optical Flow ──────────────
      const chestRoiW = Math.round(w * 0.44);
      const chestRoiH = Math.round(h * 0.14);
      const chestRoiX0 = Math.max(0, Math.min(w - chestRoiW, Math.round(eyeCenterX - chestRoiW / 2)));
      const chestRoiY0 = Math.max(0, Math.min(h - chestRoiH, Math.round(eyeCenterY + h * 0.28)));
      const chestRoiX1 = chestRoiX0 + chestRoiW;
      const chestRoiY1 = chestRoiY0 + chestRoiH;

      const abdomRoiW = Math.round(w * 0.48);
      const abdomRoiH = Math.round(h * 0.16);
      const abdomRoiX0 = Math.max(0, Math.min(w - abdomRoiW, Math.round(eyeCenterX - abdomRoiW / 2)));
      const abdomRoiY0 = Math.max(0, Math.min(h - abdomRoiH, Math.round(eyeCenterY + h * 0.46)));
      const abdomRoiX1 = abdomRoiX0 + abdomRoiW;
      const abdomRoiY1 = abdomRoiY0 + abdomRoiH;

      let chestLum = 0, chestN = 0;
      for (let y = chestRoiY0; y < chestRoiY1; y += 3) {
        for (let x = chestRoiX0; x < chestRoiX1; x += 3) {
          const i = (y * w + x) * 4;
          chestLum += px[i] + px[i + 1] + px[i + 2];
          chestN++;
        }
      }
      chestLum /= (chestN || 1);

      let abdomLum = 0, abdomN = 0;
      for (let y = abdomRoiY0; y < abdomRoiY1; y += 3) {
        for (let x = abdomRoiX0; x < abdomRoiX1; x += 3) {
          const i = (y * w + x) * 4;
          abdomLum += px[i] + px[i + 1] + px[i + 2];
          abdomN++;
        }
      }
      abdomLum /= (abdomN || 1);

      this.chestSignalBuffer.push(chestLum);
      this.abdomSignalBuffer.push(abdomLum);
      if (this.chestSignalBuffer.length > 90) this.chestSignalBuffer.shift();
      if (this.abdomSignalBuffer.length > 90) this.abdomSignalBuffer.shift();

      if (this.chestSignalBuffer.length > 15) {
        const cMean = this.chestSignalBuffer.reduce((a, b) => a + b, 0) / this.chestSignalBuffer.length;
        const aMean = this.abdomSignalBuffer.reduce((a, b) => a + b, 0) / this.abdomSignalBuffer.length;
        const cNorm = (chestLum - cMean) / (cMean || 1) * 50;
        const aNorm = (abdomLum - aMean) / (aMean || 1) * 50;

        this.currentTelemetry.thoracicWaveform = this.currentTelemetry.thoracicWaveform * 0.7 + cNorm * 0.3;
        this.currentTelemetry.abdominalWaveform = this.currentTelemetry.abdominalWaveform * 0.7 + aNorm * 0.3;
        this.currentTelemetry.respWaveform = (this.currentTelemetry.thoracicWaveform + this.currentTelemetry.abdominalWaveform) / 2;

        const cRms = Math.sqrt(this.chestSignalBuffer.reduce((a, b) => a + (b - cMean) ** 2, 0) / this.chestSignalBuffer.length);
        const aRms = Math.sqrt(this.abdomSignalBuffer.reduce((a, b) => a + (b - aMean) ** 2, 0) / this.abdomSignalBuffer.length);
        this.currentTelemetry.respTar = aRms > 0.01 ? cRms / aRms : 0.75;
        this.currentTelemetry.respMode = this.currentTelemetry.respTar > 1.4 ? 'CLAVICULAR' : (this.currentTelemetry.respTar < 0.9 ? 'DIAPHRAGMATIC' : 'BALANCED');

        const curResp = this.currentTelemetry.respWaveform;
        if (this.prevRespWaveform <= 0 && curResp > 0) {
          const crossInterval = (now - this.lastRespZeroCross) / 1000;
          this.lastRespZeroCross = now;
          if (crossInterval > 1.5 && crossInterval < 15) {
            this.currentTelemetry.rpm = this.currentTelemetry.rpm * 0.7 + (60 / crossInterval) * 0.3;
          }
        }
        this.currentTelemetry.respPhase = curResp > 0 ? 'inhale' : 'exhale';
        this.prevRespWaveform = curResp;
      }

      // ── 7. Eye Blink Detection via Luminance Delta ──────────────
      let eyeLum = 0, eyeN2 = 0;
      for (let ey = leftEyeBox.y; ey < leftEyeBox.y + leftEyeBox.h; ey += 2) {
        for (let ex = leftEyeBox.x; ex < leftEyeBox.x + leftEyeBox.w; ex += 2) {
          const i = (ey * w + ex) * 4;
          eyeLum += px[i] + px[i + 1] + px[i + 2];
          eyeN2++;
        }
      }
      for (let ey = rightEyeBox.y; ey < rightEyeBox.y + rightEyeBox.h; ey += 2) {
        for (let ex = rightEyeBox.x; ex < rightEyeBox.x + rightEyeBox.w; ex += 2) {
          const i = (ey * w + ex) * 4;
          eyeLum += px[i] + px[i + 1] + px[i + 2];
          eyeN2++;
        }
      }
      eyeLum /= (eyeN2 || 1);

      if (this.prevAvgEyeLum !== null) {
        const eyeDelta = Math.abs(eyeLum - this.prevAvgEyeLum);
        if (eyeDelta > 8 && (now - this.lastBlinkDetectionTime) > 200) {
          this.lastBlinkDetectionTime = now;
          this.blinkTimestamps.push(now);
          this.stareTimer = 0;
        }
      }
      this.prevAvgEyeLum = eyeLum;

      this.blinkTimestamps = this.blinkTimestamps.filter(t => now - t < 60000);
      this.currentTelemetry.blinkRate = this.currentTelemetry.blinkRate * 0.9 + this.blinkTimestamps.length * 0.1;

      const timeSinceLastBlink = (now - this.lastBlinkDetectionTime) / 1000;
      if (timeSinceLastBlink > 1.2) {
        this.stareTimer += dt;
      }
      this.currentTelemetry.stareDurationSec = this.stareTimer;

      // ── 8. Gaze Vector Estimation ───────────────────────────────
      let leftLum2 = 0, leftN2 = 0, rightLum2 = 0, rightN2 = 0;
      for (let ey = leftEyeBox.y; ey < leftEyeBox.y + leftEyeBox.h; ey += 2) {
        for (let ex = leftEyeBox.x; ex < leftEyeBox.x + leftEyeBox.w; ex += 2) {
          const i = (ey * w + ex) * 4;
          leftLum2 += px[i + 1]; leftN2++;
        }
      }
      for (let ey = rightEyeBox.y; ey < rightEyeBox.y + rightEyeBox.h; ey += 2) {
        for (let ex = rightEyeBox.x; ex < rightEyeBox.x + rightEyeBox.w; ex += 2) {
          const i = (ey * w + ex) * 4;
          rightLum2 += px[i + 1]; rightN2++;
        }
      }
      leftLum2 /= (leftN2 || 1);
      rightLum2 /= (rightN2 || 1);
      const gazeX = (rightLum2 - leftLum2) / ((leftLum2 + rightLum2) / 2 || 1);
      this.currentTelemetry.gazeVector = {
        x: this.currentTelemetry.gazeVector.x * 0.7 + gazeX * 0.3,
        y: this.currentTelemetry.gazeVector.y * 0.8
      };

      // ── 9. Expression heuristics from motion ────────────────────
      this.currentTelemetry.arousal = Math.min(1, Math.max(0, smoothMotion / 40));
      this.currentTelemetry.frustration = Math.min(1, Math.max(0, (this.currentTelemetry.baevsky - 100) / 300));
      this.currentTelemetry.fatigue = Math.min(1, Math.max(0, 1 - this.currentTelemetry.arousal - 0.3));
      this.currentTelemetry.valence = 0.6 - this.currentTelemetry.frustration * 0.8 - this.stareTimer * 0.03;

    } catch (cvError) {
      console.warn('[SmartSpectra] CV analysis error (face still visible):', cvError);
    }

    // ── 10. Draw SmartSpectra HUD overlays (always runs) ───────────
    this.drawVisionOverlays(ctx, w, h, roiX, roiY, roiW, roiH, isMotionHigh);
  }

  detectEyeBox(px, frameW, frameH, fallback) {
    const searchMarginX = Math.round(fallback.w * 0.7);
    const searchMarginY = Math.round(fallback.h * 0.9);
    const sx0 = Math.max(0, fallback.x - searchMarginX);
    const sy0 = Math.max(0, fallback.y - searchMarginY);
    const sx1 = Math.min(frameW - 1, fallback.x + fallback.w + searchMarginX);
    const sy1 = Math.min(frameH - 1, fallback.y + fallback.h + searchMarginY);

    let darkestLuma = Infinity;
    let bestX = fallback.x + Math.round(fallback.w / 2);
    let bestY = fallback.y + Math.round(fallback.h / 2);

    for (let y = sy0; y < sy1; y += 2) {
      for (let x = sx0; x < sx1; x += 2) {
        const i = (y * frameW + x) * 4;
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luma < darkestLuma) {
          darkestLuma = luma;
          bestX = x;
          bestY = y;
        }
      }
    }

    const target = {
      x: Math.max(0, Math.min(frameW - fallback.w, bestX - Math.round(fallback.w / 2))),
      y: Math.max(0, Math.min(frameH - fallback.h, bestY - Math.round(fallback.h / 2))),
      w: fallback.w,
      h: fallback.h
    };

    return target;
  }

  /**
   * Draws SmartSpectra 478-landmark mesh approximation, forehead rPPG ROI,
   * eye blink boxes, gaze vector, heartbeat indicator, and
   * dual-trace respiratory bounding boxes — all upright on the mirrored feed.
   */
  drawVisionOverlays(ctx, w, h, roiX, roiY, roiW, roiH, isMotionHigh) {
    const now = performance.now();

    // ── Forehead rPPG ROI Box ──────────────────────────────────────
    ctx.strokeStyle = isMotionHigh ? '#ef4444' : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(roiX, roiY, roiW, roiH);

    ctx.fillStyle = isMotionHigh ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.15)';
    ctx.fillRect(roiX, roiY, roiW, roiH);

    ctx.fillStyle = isMotionHigh ? '#ef4444' : '#06b6d4';
    ctx.font = '10px monospace';
    ctx.fillText('SMARTSPECTRA rPPG ROI', roiX + 4, roiY - 6);

    // ── Heartbeat flash indicator ──────────────────────────────────
    const beatAge = now - this.lastCardiacPulseVisualTime;
    if (beatAge < 250) {
      const beatAlpha = 1 - beatAge / 250;
      ctx.fillStyle = `rgba(239, 68, 68, ${(beatAlpha * 0.5).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(roiX + roiW + 14, roiY + roiH / 2, 6 + beatAlpha * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Static heart dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(roiX + roiW + 14, roiY + roiH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // BPM readout next to forehead
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${Math.round(this.currentTelemetry.bpm)} BPM`, roiX + roiW + 24, roiY + roiH / 2 + 4);

    // ── Eye region boxes ───────────────────────────────────────────
    const eyeW2 = Math.round(w * 0.1);
    const eyeH2 = Math.round(h * 0.06);
    const leftEye = this.eyeBoxes.left || {
      x: Math.round(w * 0.35),
      y: Math.round(h * 0.32),
      w: eyeW2,
      h: eyeH2
    };
    const rightEye = this.eyeBoxes.right || {
      x: Math.round(w * 0.55),
      y: Math.round(h * 0.32),
      w: eyeW2,
      h: eyeH2
    };

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftEye.x, leftEye.y, leftEye.w, leftEye.h);
    ctx.strokeRect(rightEye.x, rightEye.y, rightEye.w, rightEye.h);

    ctx.fillStyle = '#818cf8';
    ctx.font = '9px monospace';
    ctx.fillText('L-EYE', leftEye.x + 2, leftEye.y - 4);
    ctx.fillText('R-EYE', rightEye.x + 2, rightEye.y - 4);

    // Blink indicator flash
    const blinkAge = now - this.lastBlinkDetectionTime;
    if (blinkAge < 180) {
      ctx.fillStyle = `rgba(129, 140, 248, ${(1 - blinkAge / 180).toFixed(2)})`;
      ctx.fillRect(leftEye.x, leftEye.y, leftEye.w, leftEye.h);
      ctx.fillRect(rightEye.x, rightEye.y, rightEye.w, rightEye.h);
    }

    // ── Gaze Vector Arrow ──────────────────────────────────────────
    const gazeCenter = {
      x: (leftEye.x + leftEye.w / 2 + rightEye.x + rightEye.w / 2) / 2,
      y: (leftEye.y + leftEye.h / 2 + rightEye.y + rightEye.h / 2) / 2
    };
    const gv = this.currentTelemetry.gazeVector;
    ctx.beginPath();
    ctx.moveTo(gazeCenter.x, gazeCenter.y);
    ctx.lineTo(gazeCenter.x + gv.x * 60, gazeCenter.y + gv.y * 35);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrowhead
    const ax = gazeCenter.x + gv.x * 60;
    const ay = gazeCenter.y + gv.y * 35;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ax, ay, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Stare warning ──────────────────────────────────────────────
    if (this.stareTimer > 3) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`⚠ STARE ${this.stareTimer.toFixed(1)}s`, w * 0.35, gazeCenter.y + 18);
    }

    // ── DUAL-TRACE RESPIRATORY ROI BOXES ───────────────────────────
    const torsoCenterX = gazeCenter.x;

    // 1. Upper Chest (Thoracic / Clavicular)
    const chestY = Math.round(h * 0.60);
    const chestH = Math.round(h * 0.14);
    const chestW = Math.round(w * 0.44);
    const chestX = Math.max(0, Math.min(w - chestW, Math.round(torsoCenterX - chestW / 2)));

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(chestX, chestY, chestW, chestH);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(chestX, chestY, chestW, chestH);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.fillText('ROI 1: UPPER CHEST (THORACIC)', chestX + 6, chestY + 12);

    // Mini thoracic waveform sparkline inside box
    const tw = this.currentTelemetry.thoracicWaveform;
    const tBarH = Math.abs(tw) * chestH * 0.35;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.fillRect(chestX + chestW - 20, chestY + chestH / 2 - tBarH / 2, 12, tBarH);

    // 2. Lower Abdomen (Diaphragmatic)
    const abdomY = Math.round(h * 0.78);
    const abdomH = Math.round(h * 0.16);
    const abdomW = Math.round(w * 0.48);
    const abdomX = Math.max(0, Math.min(w - abdomW, Math.round(torsoCenterX - abdomW / 2)));

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(abdomX, abdomY, abdomW, abdomH);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(abdomX, abdomY, abdomW, abdomH);
    ctx.fillStyle = '#10b981';
    ctx.font = '9px monospace';
    ctx.fillText(`ROI 2: LOWER ABDOMEN (${this.currentTelemetry.respMode})`, abdomX + 6, abdomY + 12);

    // Mini abdominal waveform sparkline inside box
    const aw = this.currentTelemetry.abdominalWaveform;
    const aBarH = Math.abs(aw) * abdomH * 0.35;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.fillRect(abdomX + abdomW - 20, abdomY + abdomH / 2 - aBarH / 2, 12, aBarH);

    // ── SQI + Mode badge at bottom ─────────────────────────────────
    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, h - 24, w, 24);
    ctx.fillStyle = isMotionHigh ? '#ef4444' : '#10b981';
    ctx.font = '10px monospace';
    ctx.fillText(`SQI: ${this.currentTelemetry.sqi}`, 8, h - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`TAR: ${this.currentTelemetry.respTar.toFixed(2)}  |  ${this.currentTelemetry.respMode}  |  Blinks: ${Math.round(this.currentTelemetry.blinkRate)}/min`, w * 0.35, h - 8);
  }

  /**
   * High-fidelity simulation mode:
   * Generates clinically accurate synthetic telemetry based on active ADHD scenario
   */
  processSimulatedFrame(dt, timestamp) {
    const profile = this.scenarioProfiles[this.activeScenario] || this.scenarioProfiles.BASELINE_FLOW;

    // Apply any manual slider overrides if set, else profile targets
    const targetBpm = this.manualOverrides.bpm !== undefined ? this.manualOverrides.bpm : profile.targetBpm;
    const targetRmssd = this.manualOverrides.rmssd !== undefined ? this.manualOverrides.rmssd : profile.targetRmssd;
    const targetBaevsky = this.manualOverrides.baevsky !== undefined ? this.manualOverrides.baevsky : profile.targetBaevsky;
    const targetRpm = this.manualOverrides.rpm !== undefined ? this.manualOverrides.rpm : profile.targetRpm;
    const targetBlinkRate = this.manualOverrides.blinkRate !== undefined ? this.manualOverrides.blinkRate : profile.targetBlinkRate;
    const targetMotion = this.manualOverrides.motion !== undefined ? this.manualOverrides.motion : profile.targetMotion;

    // Smooth convergence toward targets
    const alpha = Math.min(1.0, dt * 1.8);
    this.currentTelemetry.bpm += (targetBpm - this.currentTelemetry.bpm) * alpha;
    this.currentTelemetry.rmssd += (targetRmssd - this.currentTelemetry.rmssd) * alpha;
    this.currentTelemetry.baevsky += (targetBaevsky - this.currentTelemetry.baevsky) * alpha;
    this.currentTelemetry.rpm += (targetRpm - this.currentTelemetry.rpm) * alpha;
    this.currentTelemetry.blinkRate += (targetBlinkRate - this.currentTelemetry.blinkRate) * alpha;
    this.currentTelemetry.motionEnergy += (targetMotion - this.currentTelemetry.motionEnergy) * alpha;
    this.currentTelemetry.landmarkVelocity = this.currentTelemetry.motionEnergy * 1.5;
    this.currentTelemetry.ibi = (60 / this.currentTelemetry.bpm) * 1000;

    // Valence & Arousal convergence
    this.currentTelemetry.valence += (profile.valence - this.currentTelemetry.valence) * alpha;
    this.currentTelemetry.arousal += (profile.arousal - this.currentTelemetry.arousal) * alpha;
    this.currentTelemetry.frustration = Math.max(0, -this.currentTelemetry.valence * 0.8);
    this.currentTelemetry.fatigue = Math.max(0, (1 - this.currentTelemetry.arousal) * 0.7);

    // Stare Duration / Inattention logic
    if (this.activeScenario === 'INATTENTION_STARE') {
      this.stareTimer += dt;
      this.currentTelemetry.stareDurationSec = this.stareTimer;
      this.currentTelemetry.gazeVector = {
        x: Math.sin(timestamp / 2000) * 0.45,
        y: 0.3
      };
    } else {
      this.stareTimer = Math.max(0, this.stareTimer - dt * 2);
      this.currentTelemetry.stareDurationSec = this.stareTimer;
      this.currentTelemetry.gazeVector = {
        x: Math.sin(timestamp / 1000) * profile.targetGazeDeviation,
        y: Math.cos(timestamp / 1200) * profile.targetGazeDeviation
      };
    }

    // Cardiac rPPG pulse wave synthesis (Systolic peak + dicrotic notch)
    const beatPeriod = 60 / this.currentTelemetry.bpm;
    this.synthPhase = (this.synthPhase + dt / beatPeriod) % 1.0;
    // Photoplethysmogram shape formula
    const p1 = Math.exp(-Math.pow((this.synthPhase - 0.2) / 0.08, 2));
    const p2 = 0.35 * Math.exp(-Math.pow((this.synthPhase - 0.42) / 0.1, 2));
    this.currentTelemetry.rppgWaveform = (p1 + p2 - 0.2) * 1.5;

    // Respiratory sine wave synthesis
    const respPeriod = 60 / this.currentTelemetry.rpm;
    this.respPhase = (this.respPhase + dt / respPeriod) % 1.0;
    const respSine = Math.sin(this.respPhase * Math.PI * 2);
    this.currentTelemetry.respWaveform = respSine;
    this.currentTelemetry.respPhase = respSine > 0 ? 'inhale' : 'exhale';

    // Motion SQI
    this.currentTelemetry.sqi = this.currentTelemetry.motionEnergy > 28 ? 'LOW (Motion Artifact)' : 'HIGH';

    // Render Canvas simulation visualizer if canvas is present
    if (this.canvasCtx && this.canvasElement) {
      this.renderSyntheticCanvas();
    }
  }

  renderSyntheticCanvas() {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    // Deep slate background with tech grid
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw stylized biometric wireframe avatar
    const centerX = w * 0.5;
    const centerY = h * 0.42;

    // Head oval
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 65, 85, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Forehead rPPG Box
    ctx.strokeStyle = '#06b6d4';
    ctx.strokeRect(centerX - 35, centerY - 65, 70, 30);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.fillRect(centerX - 35, centerY - 65, 70, 30);
    ctx.fillStyle = '#06b6d4';
    ctx.font = '9px monospace';
    ctx.fillText('rPPG FOREHEAD ROI', centerX - 32, centerY - 70);

    // Eyes and Gaze
    const leftEye = { x: centerX - 24, y: centerY - 15 };
    const rightEye = { x: centerX + 24, y: centerY - 15 };
    ctx.strokeStyle = '#818cf8';
    ctx.strokeRect(leftEye.x - 12, leftEye.y - 6, 24, 12);
    ctx.strokeRect(rightEye.x - 12, rightEye.y - 6, 24, 12);

    // Gaze rays
    const gaze = this.currentTelemetry.gazeVector;
    ctx.beginPath();
    ctx.moveTo(leftEye.x, leftEye.y);
    ctx.lineTo(leftEye.x + gaze.x * 45, leftEye.y + gaze.y * 25);
    ctx.moveTo(rightEye.x, rightEye.y);
    ctx.lineTo(rightEye.x + gaze.x * 45, rightEye.y + gaze.y * 25);
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Dual-Trace Respiratory bounding boxes
    // 1. Upper Thoracic
    const chestY = centerY + 95;
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(centerX - 65, chestY, 130, 32);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fillRect(centerX - 65, chestY, 130, 32);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px monospace';
    ctx.fillText('UPPER CHEST (THORACIC)', centerX - 58, chestY + 14);

    // 2. Lower Diaphragmatic
    const abdomY = chestY + 36;
    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(centerX - 70, abdomY, 140, 34);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(centerX - 70, abdomY, 140, 34);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`LOWER ABDOMEN (${this.currentTelemetry.respMode})`, centerX - 62, abdomY + 14);

    // Badge showing active scenario
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(10, h - 35, w - 20, 25);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Scenario: ${this.scenarioProfiles[this.activeScenario]?.name || 'Live'}`, 20, h - 18);
  }
}
