# FocusPulse: ADHD Bio-Adaptive Co-Pilot
> **Contactless Human-Sensing, 40Hz Neuro-Audio Entrainment, Dual-Trace Respiration & GPU Particle Shaders for ADHD Management**  
> *Powered by the Presage SmartSpectra SDK & Deployed on Google Cloud Run*

[![Live Demo](https://img.shields.io/badge/Google_Cloud_Run-Live_Production-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://focuspulse-760833501708.us-central1.run.app)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://focuspulse-760833501708.us-central1.run.app)
[![Web Audio API](https://img.shields.io/badge/Web_Audio-40Hz_Gamma-8A2BE2?style=for-the-badge)](https://focuspulse-760833501708.us-central1.run.app)
[![WebGL](https://img.shields.io/badge/WebGL-GPU_Shaders-00C4B4?style=for-the-badge&logo=webgl&logoColor=white)](https://focuspulse-760833501708.us-central1.run.app)

---

## 🌐 Live Production Deployment

FocusPulse is containerized and deployed on **Google Cloud Run** with auto-provisioned HTTPS (providing the secure context required for browser webcam, Web Audio, and Web Bluetooth APIs):

* 🚀 **Live Production Application:** **[https://focuspulse-760833501708.us-central1.run.app](https://focuspulse-760833501708.us-central1.run.app)**
* **GCP Project:** `adhd-9999`
* **Region:** `us-central1`
* **Artifact Registry Image:** `us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest`

---

## 🧠 Executive Summary

Individuals with Attention-Deficit/Hyperactivity Disorder (ADHD) face daily challenges with **sustained attention, hyperfocus burnout, and emotional dysregulation/task paralysis**. 

Traditional wearable solutions (smartwatches, chest straps) suffer from high abandonment rates in ADHD populations due to:
1. **Forgetfulness & Object Permanence**: Forgetting to charge or put on the watch.
2. **Tactile Sensory Sensitivity**: Discomfort from tight wristbands or vibrations.
3. **Rejection Sensitive Dysphoria (RSD)**: Guilt triggered by punitive smartwatch notifications (*"You've been idle!"*).

**FocusPulse** solves this by leveraging the **Presage SmartSpectra SDK** to provide **100% contactless, camera-based physiological monitoring**. Using standard webcams, FocusPulse tracks real-time cardiac vitals, dual-trace respiratory dynamics, and facial/ocular metrics to detect focus drift and autonomic freeze early, delivering gentle, ambient micro-interventions.

---

## 🏗️ System Architecture

```
                         [ Camera Feed (30 FPS) ]
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      PRESAGE SMARTSPECTRA SDK                          │
│  ├─ rPPG Optical Extractor ────► Pulse Rate, Plethysmogram & HRV (RMSSD)│
│  ├─ Dual-ROI Motion Flow ──────► Upper Chest & Lower Abdomen Waves     │
│  └─ 478 Landmark Facial Mesh ──► Eye Blinks, EAR & Gaze Vectors        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Real-Time Telemetry Stream
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ADHD SIGNAL INTERPRETER ENGINE                      │
│  ├─ Baseline Calibration (Establishes resting mean & SD for vitals)    │
│  ├─ Signal Quality Index (SQI Gating out optical motion artifacts)     │
│  ├─ The "Stimming Paradox" Filter (Differentiates stimming vs panic)   │
│  └─ Adaptive Threshold Engine (Flow, Inattention, Freeze, Anxiety)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Bio-Adaptive Event Trigger
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          BIO-ADAPTIVE UI                               │
│  ├─ Ambient Attention Pulse: Cyan halo & 40Hz Gamma Isochronic beat    │
│  ├─ Dual-Trace Paced Breathing: 0.1 Hz vagal resonance biofeedback orb │
│  ├─ Micro-Task Paralysis Buster: Dims clutter, auto-chunks into 2m steps│
│  └─ GPU WebGL Shaders: 8,000 bio-reactive particles pulsing with vitals│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Mapping Presage SmartSpectra Signals to ADHD Symptoms

| SmartSpectra Signal | Sensor Payload | ADHD Clinical Marker | System Action & Micro-Intervention |
| :--- | :--- | :--- | :--- |
| **Blink Rate & Eye Gaze** | Blink frequency, EAR, gaze vectors | **Visual Inattention & Mind-Wandering** (Hypo-arousal "Zombie Stare" > 6s or off-screen glances) | **Gentle Attention Visual Pulse**: Peripheral luminance breathing vignette + synthesized 40Hz gamma isochronic audio beat. |
| **rPPG Pulse & HRV** | Cardiac variability (RMSSD), Baevsky Stress Index, IBI | **Task Paralysis & Autonomic Freeze** (Sympathetic surge + vagal collapse) | **Micro-Task Paralysis Buster**: Automatically dims clutter, isolates 1 single 2-minute atomic step, removes choice overload. |
| **Dual-Trace Respiration** | Upper chest & lower abdominal displacement waveforms | **Clavicular Hyperventilation vs. Diaphragmatic Calming** (Anxiety / Hypocapnia) | **Paced Breathing Biofeedback**: Visual expanding/contracting orb synced to 0.1 Hz vagal resonance or 4-4-4-4 box breathing. |
| **Head Motion & Stability** | Landmark coordinate velocity, optical flow energy | **Physical Restlessness / Fidgeting** | **Adaptive Movement Reset**: 60-second tactile energy realignment. *(Guarded by the Stimming Paradox: productive stimming with on-screen gaze is protected).* |
| **Facial Expressions & Valence** | Frustration, brow furrow, fatigue, valence | **Emotional Dysregulation / Burnout** | **Sensory De-escalation**: Screen dimming, dopamine reset, hydration prompts. |

---

## 🚀 Key Features

### 1. 🫁 Dual-Trace Respiration (Upper Chest vs. Lower Abdomen)
FocusPulse separates and analyzes two distinct respiratory zones via optical flow:
* **Upper Chest (Thoracic/Clavicular) Trace**: Monitors clavicular elevation (Sky/Cyan trace). High thoracic amplitude flags **sympathetic fight-or-flight, anxiety, and hypocapnia risk**.
* **Lower Abdomen (Diaphragmatic) Trace**: Monitors lower belly and diaphragmatic expansion (Emerald trace). Diaphragmatic breathing stimulates the **vagus nerve**, elevating HRV RMSSD and restoring prefrontal executive control.
* **Thoracoabdominal Ratio (TAR)**:
  $$\text{TAR} = \frac{\text{Upper Thoracic Amplitude}}{\text{Lower Abdominal Amplitude}}$$
  * $\text{TAR} > 1.4$: **Clavicular Hyperventilation** $\rightarrow$ Activates Paced Breathing Guide.
  * $\text{TAR} < 0.9$: **Optimal Diaphragmatic Regulation** $\rightarrow$ Confirms Flow State.

### 2. 🎧 Web Audio API Engine (40Hz Gamma Isochronic & Binaural Beats)
A zero-dependency neuro-entrainment audio synthesizer built directly in the browser:
* **40Hz Gamma Isochronic Pulses**: Periodic amplitude-modulated carrier tone (216 Hz, 432 Hz, or 528 Hz) pulsing at 40Hz. Proven in EEG literature to synchronize cortical gamma oscillations and sustain working memory. Effective on laptop speakers.
* **Stereo Binaural Beats**: Dual independent phase-aligned oscillators ($f_L = 216\text{ Hz}$, $f_R = 256\text{ Hz} \rightarrow \Delta f = 40\text{ Hz}$) routed via stereo `ChannelMergerNode` for headphones.
* **Brownian / Pink Noise Masking Generator**: Continuous integrated noise ($1/f^2$ spectral density) providing **auditory stochastic resonance** to ground racing thoughts and mask distracting ambient office noises.
* **Live FFT Analyser**: Real-time 32-bin frequency spectrum visualizer rendered on canvas.

### 3. ✨ Modern Canvas Particle & Shader FX (Bio-WebGL Canvas)
An interactive GPU-accelerated WebGL 3D particle system running **8,000+ particles** driven by custom GLSL vertex and fragment shaders:
* **Direct Bio-Signal Synchronization**:
  * `u_pulse`: Particles swell outward on every systolic rPPG heartbeat.
  * `u_breathing`: The entire particle matrix breathes in sync with thoracic/abdominal waves.
  * `u_audio`: Particle sizes and wave heights dance to the live 40Hz audio spectrum.
  * `u_state`: Dynamically shifts color palettes based on ADHD state (Cyan/Emerald for Flow, Amber/Gold for Freeze, Violet/Coral for Restlessness).
* **3 Topologies**:
  * 🧬 `Neural Orb`: Fibonacci 3D sphere mimicking prefrontal neural firing.
  * 🌀 `Vortex Swarm`: Dual-toroidal cosmic particle stream.
  * 🌐 `Quantum Field`: 3D wave mesh responding to harmonic frequencies.
* **Focus Meditation View**: Expand to a distraction-free, full-screen particle canvas with interactive gravitational mouse physics.

### 4. 🛡️ The "Fidgeting Paradox" Filter
Clinical research demonstrates that physical movement (fidgeting, posture shifting) often acts as an unconscious compensatory mechanism that upregulates dopamine in the prefrontal cortex. FocusPulse implements **Multi-Modal Co-occurrence Gating**: if high motion energy occurs while gaze is locked on screen and stress is low, it is classified as **Productive Stimming** and left completely undisturbed.

### 5. 🧊 Micro-Task Paralysis Buster
When an acute sympathetic freeze is detected ($RMSSD < 18\text{ ms}$, Baevsky Index $> 300$, zero motion), traditional productivity apps fail by sending more alerts. FocusPulse automatically dims background clutter and decomposes daunting tasks into **one single 2-minute atomic micro-step** to break executive paralysis.

### 6. ⌚ Zero-Wearable Core with Optional Hybrid Smartwatch Support
While 100% contactless via webcam rPPG, FocusPulse also includes a built-in **Web Bluetooth API** client (`0x180D` Heart Rate GATT service). Clicking **"Pair Smartwatch (Optional)"** allows any BLE heart rate monitor (Apple Watch, Wear OS, Garmin, Polar) to pair as a secondary sensor.

---

## ⚡ Quick Start

### Option 1: Live Web App (No Installation)
Visit **[https://focuspulse-760833501708.us-central1.run.app](https://focuspulse-760833501708.us-central1.run.app)** in Google Chrome or Microsoft Edge.

### Option 2: Run Locally with Node.js
```bash
# Clone the repository and navigate into the workspace
git clone https://github.com/username/adhd-google.git
cd adhd-google

# Start the zero-dependency local server
node server.js
```
Open **`http://localhost:3000`** in your browser.

### Option 3: Run with Docker
```bash
# Build the Docker image
docker build -t focuspulse:latest .

# Run container locally on port 8080
docker run -p 8080:8080 focuspulse:latest
```
Open **`http://localhost:8080`** in your browser.

---

## ☁️ Google Cloud Run Deployment

To deploy FocusPulse to Google Cloud Run using service account credentials:

```bash
# 1. Authenticate with Google Cloud Service Account
gcloud auth activate-service-account --key-file=adhd.json
gcloud config set project adhd-9999

# 2. Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

# 3. Build & push Docker image to Artifact Registry
docker build -t focuspulse:latest .
docker tag focuspulse:latest us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest
docker push us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest

# 4. Deploy container to Google Cloud Run
gcloud run deploy focuspulse \
  --image us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080
```

---

## 🧪 Interactive Clinical Scenarios

Inside the application's right-hand panel, click any scenario to stress-test how the entire pipeline reacts:
1. **Balanced Flow State**: 72 BPM, 55ms RMSSD, 14 RPM, Diaphragmatic breathing ($TAR < 0.9$).
2. **Mind-Wandering (Zombie Stare)**: Prolonged blank fixation (> 8s), blink rate drops to 3/min, gaze drifts off-screen $\rightarrow$ triggers peripheral attention vignette + 40Hz audio focus pulse.
3. **Task Paralysis & Freeze**: HRV collapses to 14ms RMSSD, Baevsky Stress Index spikes to 385, motion drops to near-zero (motor freeze) $\rightarrow$ triggers screen dimming & Micro-Task Chunking assistant.
4. **Clavicular Hyperventilation**: Breathing surges to 27 RPM with upper chest dominance ($TAR > 1.8$) $\rightarrow$ launches interactive Paced Breathing biofeedback orb.
5. **Agitated Restlessness**: Erratic head motion with off-screen gaze $\rightarrow$ launches 60-second movement break.
6. **Cognitive Burnout**: Low autonomic tone, prolonged fatigue $\rightarrow$ triggers sensory de-escalation.

---

## 📁 Repository Structure

```
adhd-google/
├── index.html                   # Cyber-medical UI, canvas scopes, and intervention cards
├── style.css                    # Ambient attention pulse vignette, breathing orb, glassmorphism
├── server.js                    # Zero-dependency local Node.js HTTP server (binds to 0.0.0.0)
├── package.json                 # Node.js project configuration and scripts
├── Dockerfile                   # Production multi-stage Alpine container definition
├── .dockerignore                # Protects credentials (adhd.json) from container images
├── README.md                    # Setup, clinical guide & scenario walkthrough
├── DEVPOST_SUBMISSION.md        # Complete DEV.to / Hackathon submission article
└── src/
    ├── smartSpectraEngine.js   # Dual engine: WebCam rPPG/face vision & scenario simulation
    ├── adhdInterpreter.js      # Baseline calibration, sliding windows & multi-modal state machine
    ├── bioAdaptiveUI.js        # UI controller: breathing orb, paralysis buster & visual cues
    ├── audioEngine.js          # Web Audio API 40Hz Isochronic, Binaural & Brown noise engine
    ├── visualizerFX.js         # WebGL 3D Particle & Shader FX bio-reactive canvas
    ├── presageSdkAdapter.js    # Official @smartspectra/node-sdk integration adapter
    └── app.js                  # Master controller wiring telemetry, audio, WebGL & DOM
```

---

## 🔬 Privacy & On-Device Processing
All camera frames and physiological feature extractions run **100% locally on-device** in client browser memory. No video feeds or biometric telemetry are ever streamed or stored on external servers, ensuring strict privacy and HIPAA/GDPR alignment by design.

---

## 📄 License
This project is licensed under the MIT License.
