/**
 * FocusPulse - ADHD Signal Interpreter Engine
 * 
 * Implements:
 * 1. Personal Baseline Calibration (Mean & SD for BPM, RMSSD, RPM, Blinks, Motion)
 * 2. Sliding Window Aggregator (with SQI noise gating)
 * 3. Multi-Modal Decision Engine (Inattention, Overwhelm/Paralysis, Stimming vs Restlessness, Breathing)
 * 4. Neurodivergent State Machine (Anti-RSD, Zero-Guilt, Hysteresis debouncing)
 */

export class ADHDInterpreter {
  constructor(options = {}) {
    this.options = options;
    this.onStateChange = options.onStateChange || (() => {});
    this.onIndicesUpdate = options.onIndicesUpdate || (() => {});
    this.onCalibrationProgress = options.onCalibrationProgress || (() => {});

    // Calibration State
    this.isCalibrating = true;
    this.calibrationProgress = 0; // 0 to 100%
    this.calibrationDurationSec = 15;
    this.calibrationSamples = [];

    // Personal Baseline (defaults will be updated after calibration)
    this.baseline = {
      bpm: 72,
      bpmSd: 6,
      rmssd: 54,
      rmssdSd: 12,
      baevsky: 90,
      baevskySd: 25,
      rpm: 14,
      rpmSd: 2.5,
      blinkRate: 15,
      blinkRateSd: 4,
      motionEnergy: 4,
      motionEnergySd: 2
    };

    // Current State Machine
    this.currentState = 'STATE_FLOW';
    this.stateTimerSec = 0;
    this.stateConfidence = 0.95;

    // Computed ADHD Diagnostic Indices (0 to 100%)
    this.indices = {
      inattentionIndex: 5,
      overwhelmIndex: 8,
      restlessnessIndex: 6,
      respiratoryDistressIndex: 5,
      burnoutIndex: 10,
      isProductiveStimming: false
    };

    // Sliding Windows (buffers)
    this.shortWindow = []; // 10s window for fast ocular metrics
    this.longWindow = [];  // 30s window for autonomic HRV & breathing

    // Hysteresis counters
    this.inattentionSustain = 0;
    this.paralysisSustain = 0;
    this.restlessSustain = 0;
    this.shallowBreathSustain = 0;
  }

  startCalibration() {
    this.isCalibrating = true;
    this.calibrationProgress = 0;
    this.calibrationSamples = [];
  }

  processTelemetry(payload) {
    const now = payload.timestamp;

    // Handle Calibration Phase
    if (this.isCalibrating) {
      this.handleCalibration(payload);
      return;
    }

    // Push into sliding windows (filtering out low SQI when appropriate)
    this.shortWindow.push(payload);
    if (this.shortWindow.length > 300) this.shortWindow.shift(); // ~10 sec at 30 fps

    // Autonomic window: only accept high SQI rPPG or hold previous valid
    if (payload.pulse.sqi.startsWith('HIGH')) {
      this.longWindow.push(payload);
      if (this.longWindow.length > 900) this.longWindow.shift(); // ~30 sec
    }

    // 1. Compute Individual Metric Z-Scores
    const zBpm = (payload.pulse.bpm - this.baseline.bpm) / this.baseline.bpmSd;
    const zRmssd = (payload.pulse.rmssd - this.baseline.rmssd) / this.baseline.rmssdSd;
    const zBaevsky = (payload.pulse.baevsky - this.baseline.baevsky) / this.baseline.baevskySd;
    const zRpm = (payload.respiration.rpm - this.baseline.rpm) / this.baseline.rpmSd;

    // 2. Compute ADHD Multi-Modal Diagnostic Indices

    // A) INATTENTION INDEX (Visual Inattention / Mind-Wandering)
    // Marked by: "Zombie Stare" (stare duration > 6s, blink rate plunge < 6/min) OR large gaze deviation
    let inattentionScore = 0;
    if (payload.ocular.stareDurationSec > 5.0) {
      // Linear ramp: 5s = 40%, 10s+ = 100%
      inattentionScore += Math.min(65, (payload.ocular.stareDurationSec - 5) * 13);
    }
    if (payload.ocular.blinkRate < 6) {
      inattentionScore += 25;
    }
    const gazeDistance = Math.hypot(payload.ocular.gazeVector.x, payload.ocular.gazeVector.y);
    if (gazeDistance > 0.35) {
      inattentionScore += Math.min(35, (gazeDistance - 0.35) * 100);
    }
    this.indices.inattentionIndex = Math.round(Math.min(100, Math.max(0, inattentionScore)));

    // B) OVERWHELM & TASK PARALYSIS INDEX (Autonomic Sympathetic Freeze)
    // Marked by: Severe HRV collapse (zRmssd < -1.5), Baevsky stress spike (> 260),
    // tachycardia, coupled with motor freeze (motionEnergy < 2.5)
    let overwhelmScore = 0;
    if (zRmssd < -1.0) {
      overwhelmScore += Math.min(45, Math.abs(zRmssd) * 25);
    }
    if (payload.pulse.baevsky > 220) {
      overwhelmScore += Math.min(40, (payload.pulse.baevsky - 220) * 0.25);
    }
    if (zBpm > 1.0) {
      overwhelmScore += 15;
    }
    // Paradoxical motor freeze confirmation
    if (payload.motion.motionEnergy < 3.0 && overwhelmScore > 40) {
      overwhelmScore += 10;
    }
    this.indices.overwhelmIndex = Math.round(Math.min(100, Math.max(0, overwhelmScore)));

    // C) RESTLESSNESS vs. FUNCTIONAL STIMMING
    // Marked by: high motion energy (> 25)
    // THE STIMMING PARADOX: If gaze is steady on screen (< 0.25) and stress is low,
    // this is PRODUCTIVE STIMMING!
    let restlessScore = 0;
    const isHighMotion = payload.motion.motionEnergy > 24;
    const isGazeCentered = gazeDistance < 0.25;
    const isStressLow = payload.pulse.baevsky < 200;

    if (isHighMotion) {
      if (isGazeCentered && isStressLow) {
        // Productive Stimming!
        this.indices.isProductiveStimming = true;
        restlessScore = 20; // Keep restlessness low
      } else {
        // Agitated, distracted hyperactivity
        this.indices.isProductiveStimming = false;
        restlessScore = Math.min(100, (payload.motion.motionEnergy - 20) * 2.2);
      }
    } else {
      this.indices.isProductiveStimming = false;
      restlessScore = Math.min(30, payload.motion.motionEnergy * 1.5);
    }
    this.indices.restlessnessIndex = Math.round(Math.min(100, Math.max(0, restlessScore)));

    // D) RESPIRATORY DISTRESS / ANXIETY
    // Marked by: rapid breathing (> 22 RPM), high zRpm, and Clavicular dominance (TAR > 1.3)
    let breathScore = 0;
    if (payload.respiration.rpm > 21) {
      breathScore += Math.min(60, (payload.respiration.rpm - 21) * 10);
    }
    if (payload.respiration.tar && payload.respiration.tar > 1.3) {
      breathScore += Math.min(30, (payload.respiration.tar - 1.3) * 30);
    }
    if (zBpm > 1.2) {
      breathScore += 15;
    }
    this.indices.respiratoryDistressIndex = Math.round(Math.min(100, Math.max(0, breathScore)));
    this.indices.respTar = payload.respiration.tar || 0.75;
    this.indices.respMode = payload.respiration.mode || 'DIAPHRAGMATIC';

    // E) BURNOUT & COGNITIVE FATIGUE
    let burnoutScore = 0;
    if (payload.expressions.fatigue > 0.3) {
      burnoutScore += payload.expressions.fatigue * 40;
    }
    if (payload.expressions.frustration > 0.3) {
      burnoutScore += payload.expressions.frustration * 30;
    }
    if (zRmssd < -0.8 && payload.pulse.bpm < 66) {
      burnoutScore += 25; // Hypo-arousal exhaustion
    }
    this.indices.burnoutIndex = Math.round(Math.min(100, Math.max(0, burnoutScore)));

    // Notify listeners of index updates
    this.onIndicesUpdate(this.indices);

    // 3. Evaluate State Machine Transitions (with Hysteresis)
    this.evaluateStateMachine(payload);
  }

  evaluateStateMachine(payload) {
    let targetState = 'STATE_FLOW';
    let targetConfidence = 0.95;

    // Priority 1: Autonomic Freeze & Task Paralysis (Highest clinical severity)
    if (this.indices.overwhelmIndex >= 65) {
      this.paralysisSustain++;
      if (this.paralysisSustain > 5) {
        targetState = 'STATE_OVERWHELM_PARALYSIS';
        targetConfidence = this.indices.overwhelmIndex / 100;
      }
    } else {
      this.paralysisSustain = Math.max(0, this.paralysisSustain - 1);
    }

    // Priority 2: Acute Shallow Breathing / Anxiety
    if (targetState === 'STATE_FLOW' && this.indices.respiratoryDistressIndex >= 65) {
      this.shallowBreathSustain++;
      if (this.shallowBreathSustain > 4) {
        targetState = 'STATE_SHALLOW_BREATHING';
        targetConfidence = this.indices.respiratoryDistressIndex / 100;
      }
    } else {
      this.shallowBreathSustain = Math.max(0, this.shallowBreathSustain - 1);
    }

    // Priority 3: Visual Inattention (Zombie Stare / Mind Wandering)
    if (targetState === 'STATE_FLOW' && this.indices.inattentionIndex >= 60) {
      this.inattentionSustain++;
      if (this.inattentionSustain > 3) {
        targetState = 'STATE_INATTENTION';
        targetConfidence = this.indices.inattentionIndex / 100;
      }
    } else {
      this.inattentionSustain = Math.max(0, this.inattentionSustain - 1);
    }

    // Priority 4: Agitated Restlessness (Only if NOT productive stimming!)
    if (targetState === 'STATE_FLOW' && this.indices.restlessnessIndex >= 65 && !this.indices.isProductiveStimming) {
      this.restlessSustain++;
      if (this.restlessSustain > 6) {
        targetState = 'STATE_RESTLESS';
        targetConfidence = this.indices.restlessnessIndex / 100;
      }
    } else {
      this.restlessSustain = Math.max(0, this.restlessSustain - 1);
    }

    // Priority 5: Burnout / Fatigue
    if (targetState === 'STATE_FLOW' && this.indices.burnoutIndex >= 68) {
      targetState = 'STATE_BURNOUT';
      targetConfidence = this.indices.burnoutIndex / 100;
    }

    // If productive stimming, explicitly denote flow with stimming
    if (targetState === 'STATE_FLOW' && this.indices.isProductiveStimming) {
      targetState = 'STATE_FLOW_STIMMING';
      targetConfidence = 0.9;
    }

    // Trigger state change if changed
    if (targetState !== this.currentState) {
      const prevState = this.currentState;
      this.currentState = targetState;
      this.stateConfidence = targetConfidence;
      this.onStateChange({
        prevState,
        currentState: targetState,
        confidence: targetConfidence,
        indices: { ...this.indices },
        reason: this.getStateReason(targetState, payload)
      });
    }
  }

  getStateReason(state, payload) {
    switch (state) {
      case 'STATE_INATTENTION':
        return `Visual inattention detected: gaze fixation exceeded ${payload.ocular.stareDurationSec.toFixed(1)}s with blink rate at ${payload.ocular.blinkRate}/min.`;
      case 'STATE_OVERWHELM_PARALYSIS':
        return `Autonomic freeze: HRV RMSSD collapsed to ${payload.pulse.rmssd}ms (Baevsky Stress: ${payload.pulse.baevsky}) with motor inhibition.`;
      case 'STATE_SHALLOW_BREATHING':
        return `Clavicular hyperventilation detected: breathing frequency surged to ${payload.respiration.rpm} RPM.`;
      case 'STATE_RESTLESS':
        return `Agitated motor hyperactivity detected (motion energy: ${payload.motion.motionEnergy}) with gaze detachment.`;
      case 'STATE_FLOW_STIMMING':
        return `Productive stimming detected: rhythmic motor activity with gaze locked on task. Protection active.`;
      case 'STATE_BURNOUT':
        return `Cognitive fatigue & low autonomic reserve detected. Micro-rest recommended.`;
      case 'STATE_FLOW':
      default:
        return `Autonomic markers balanced in optimal focus equilibrium.`;
    }
  }

  handleCalibration(payload) {
    this.calibrationSamples.push(payload);
    const progress = Math.min(100, Math.round((this.calibrationSamples.length / (this.calibrationDurationSec * 30)) * 100));
    this.calibrationProgress = progress;
    this.onCalibrationProgress(progress);

    if (progress >= 100) {
      this.finishCalibration();
    }
  }

  finishCalibration() {
    this.isCalibrating = false;
    if (this.calibrationSamples.length === 0) return;

    // Compute means
    const n = this.calibrationSamples.length;
    const bpms = this.calibrationSamples.map(s => s.pulse.bpm);
    const rmssds = this.calibrationSamples.map(s => s.pulse.rmssd);
    const baevskys = this.calibrationSamples.map(s => s.pulse.baevsky);
    const rpms = this.calibrationSamples.map(s => s.respiration.rpm);
    const blinks = this.calibrationSamples.map(s => s.ocular.blinkRate);
    const motions = this.calibrationSamples.map(s => s.motion.motionEnergy);

    const calcMean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const calcSd = (arr, mean) => Math.sqrt(arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length);

    this.baseline.bpm = Math.round(calcMean(bpms));
    this.baseline.bpmSd = Math.max(3, calcSd(bpms, this.baseline.bpm));

    this.baseline.rmssd = Math.round(calcMean(rmssds));
    this.baseline.rmssdSd = Math.max(5, calcSd(rmssds, this.baseline.rmssd));

    this.baseline.baevsky = Math.round(calcMean(baevskys));
    this.baseline.baevskySd = Math.max(15, calcSd(baevskys, this.baseline.baevsky));

    this.baseline.rpm = Math.round(calcMean(rpms) * 10) / 10;
    this.baseline.rpmSd = Math.max(1.5, calcSd(rpms, this.baseline.rpm));

    this.baseline.blinkRate = Math.round(calcMean(blinks));
    this.baseline.blinkRateSd = Math.max(2, calcSd(blinks, this.baseline.blinkRate));

    this.baseline.motionEnergy = Math.round(calcMean(motions) * 10) / 10;
    this.baseline.motionEnergySd = Math.max(1, calcSd(motions, this.baseline.motionEnergy));

    this.onCalibrationProgress(100, this.baseline);
  }
}
