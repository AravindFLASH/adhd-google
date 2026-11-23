---
title: FocusPulse: Building a Contactless Bio-Adaptive ADHD Co-Pilot with Presage SmartSpectra & Google Cloud Run 🧠⚡
published: true
tags: webdev, showdev, ai, javascript, cloud
cover_image: https://raw.githubusercontent.com/username/focuspulse/main/assets/cover.png
canonical_url: https://focuspulse-760833501708.us-central1.run.app
---

# FocusPulse: The ADHD Bio-Adaptive Co-Pilot
> *Real-time contactless physiological sensing, 40Hz neuro-audio entrainment, dual-trace respiration, and WebGL particle shaders to conquer executive dysfunction—without wearables.*

**Live Production Demo:** 🚀 **[focuspulse-760833501708.us-central1.run.app](https://focuspulse-760833501708.us-central1.run.app)**  
**GitHub / Codebase:** Containerized Node.js + WebGL + Web Audio API on Google Cloud Run

---

## 🌟 The Spark: The Wearable Dilemma & Interoceptive Blindness

If you have Attention-Deficit/Hyperactivity Disorder (ADHD), you know the daily struggle isn't a lack of intelligence or motivation. It's a fundamental neurobiological challenge with **executive function, working memory overload, and interoceptive blindness**. 

People with ADHD frequently don't realize their nervous system is spiraling:
- We don't notice our breathing has turned into rapid, shallow chest panting.
- We don't notice our heart rate spiking and Heart Rate Variability (HRV) collapsing as we stare in terror at a blank document (**Task Paralysis / The Wall of Awful**).
- We don't notice our eyes freezing into an unblinking 10-second "Zombie Stare" as our Default Mode Network (DMN) hijacks our working memory.

### Why Existing Wearables Fail for ADHD
Every productivity and wellness app tells you to *"wear a smartwatch or chest strap."* But for the ADHD brain, wearables present fatal friction points:
1. **Object Permanence & Charging**: We take off the watch to charge it, forget it exists on the nightstand for three weeks, and abandon the habit.
2. **Tactile Sensory Overload**: High comorbidity with sensory processing differences means tight wristbands, sweaty silicone, or buzzing vibrations cause physical irritation and distraction.
3. **Rejection Sensitive Dysphoria (RSD)**: Traditional productivity wearables vibrate aggressively to scold you (*"You've been idle! Get moving!"*), triggering shame, guilt, and defiance.

**What if your computer camera could ambiently sense your autonomic nervous system in real-time—completely contactlessly—and gently adapt your workspace before you crash?**

Enter **FocusPulse**, powered by the **Presage SmartSpectra SDK**.

---

## 🔬 How FocusPulse Uses Presage SmartSpectra for ADHD

The **Presage SmartSpectra SDK** is a game-changing contactless human-sensing engine. By analyzing subtle micro-vascular blood volume flushes and optical flow from ordinary consumer webcams, SmartSpectra extracts clinical-grade physiological signals without touching the skin.

Here is how FocusPulse maps each **Presage SmartSpectra signal** directly to core ADHD clinical markers:

```
[ Webcam 30 FPS Video ]
          │
          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      PRESTAGE SMARTSPECTRA SDK                         │
│  ├─ rPPG Optical Sensor ───────► Pulse Rate, Plethysmogram & HRV       │
│  ├─ Dual-ROI Motion Flow ──────► Upper Chest & Lower Abdomen Waves     │
│  └─ 478 Landmark Facial Mesh ──► Eye Blink Rate, EAR & Gaze Vectors    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Live Telemetry Stream
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ADHD SIGNAL INTERPRETER ENGINE                      │
│  ├─ Baseline Calibration (Resting Mean & SD for Vitals)                │
│  ├─ Signal Quality Index (SQI Gating out motion noise)                 │
│  ├─ The "Stimming Paradox" Filter (Protects functional motor ticks)    │
│  └─ Multi-Modal State Machine (Flow, Inattention, Freeze, Anxiety)     │
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

### 1. rPPG Heart Rate Variability (HRV) $\rightarrow$ Conquering Task Paralysis
* **The ADHD Marker**: When faced with a daunting task, individuals with ADHD experience an acute sympathetic fight-or-flight freeze. Autonomic HRV (**RMSSD**) collapses ($< 18\text{ ms}$) and the **Baevsky Stress Index** spikes ($> 300$), while body motion drops to zero (motor freeze).
* **The Presage Solution**: SmartSpectra captures green-channel capillary micro-flushes in the forehead region to compute inter-beat intervals (IBI) and RMSSD in real time.
* **The System Response**: FocusPulse activates the **Micro-Task Paralysis Buster**. The entire interface automatically dims distracting background clutter and isolates **one single 2-minute atomic micro-step** (e.g. *"Just open the document and write 1 bullet point"*), instantly dissolving choice paralysis.

### 2. Dual-Trace Respiration $\rightarrow$ De-escalating Clavicular Panic
* **The ADHD Marker**: Anxiety and task dread trigger rapid, shallow upper-chest (clavicular) hyperventilation, blowing off $CO_2$ and causing cerebral vasoconstriction (brain fog). Conversely, lower-abdominal (diaphragmatic) breathing activates the vagus nerve and stimulates prefrontal focus.
* **The Presage Solution**: SmartSpectra tracks two distinct regions of interest:
  1. *Upper Thoracic ROI*: Clavicular elevation.
  2. *Lower Abdominal ROI*: Diaphragmatic expansion.
  It calculates the **Thoracoabdominal Ratio (TAR)**:
  $$\text{TAR} = \frac{\text{Upper Thoracic Amplitude}}{\text{Lower Abdominal Amplitude}}$$
* **The System Response**: When $\text{TAR} > 1.4$, FocusPulse launches the **Paced Breathing Biofeedback Guide**, guiding the user with an expanding/contracting orb down to $0.1\text{ Hz}$ (6 breaths/minute resonance frequency) while prompting: *"Breathe deep into your lower belly, keep chest still."*

### 3. Eye Aspect Ratio (EAR) & Gaze Vectors $\rightarrow$ Catching the "Zombie Stare"
* **The ADHD Marker**: Focus lapses manifest in two ocular signatures:
  1. *Hypo-arousal mind-wandering*: The unblinking **Zombie Stare** (blink rate drops to $< 5/\text{min}$, gaze freezes on one point for $> 8\text{ seconds}$).
  2. *Hyper-saccadic distractibility*: Rapid off-screen glancing.
* **The Presage Solution**: SmartSpectra calculates Eye Aspect Ratio (landmarks 33, 133, 159, 145) and continuous gaze vectors.
* **The System Response**: A soft, non-intrusive peripheral cyan luminance wave (the **Gentle Attention Pulse**) sweeps across the screen borders, accompanied by a subtle 40Hz audio focus beat to gently snap attention back without triggering guilt.

### 4. Head Motion & The "Stimming Paradox"
* **The Clinical Breakthrough**: Clinical neuroscience proves that motor activity (fidgeting, chair rocking, foot tapping) is often an unconscious compensatory mechanism that upregulates prefrontal dopamine and norepinephrine. Chastising an ADHD user for fidgeting destroys their flow state!
* **The FocusPulse Fix**: FocusPulse uses **Multi-Modal Co-occurrence Gating**. If motion is high BUT gaze is locked on the screen and stress is normal, it is classified as **Productive Stimming** and left completely undisturbed. Only when motion co-occurs with gaze detachment or high autonomic stress does it offer a non-judgmental **60-Second Movement Break**.

---

## ⚡ The Feature Deep Dive

### 🎧 1. Web Audio API Engine (40Hz Gamma Isochronic & Binaural Beats)
Built from scratch using native browser Web Audio API primitives—zero external audio files or MP3 dependencies:
* **40Hz Gamma Isochronic Pulses**: Periodic amplitude-modulated carrier tone (216 Hz, 432 Hz, or 528 Hz) pulsing at 40Hz. Proven in EEG literature to synchronize cortical gamma oscillations and improve working memory.
* **Stereo Binaural Beats**: Dual phase-aligned oscillators ($f_L = 216\text{ Hz}$, $f_R = 256\text{ Hz} \rightarrow \Delta f = 40\text{ Hz}$) routed through a stereo `ChannelMergerNode`.
* **Brownian / Pink Noise Masking**: Continuous integrated stochastic noise ($1/f^2$ spectral density) providing **stochastic resonance** to quiet racing thoughts and mask distracting ambient noises.
* **Live FFT Analyser**: Real-time 32-bin frequency spectrum visualizer rendered on canvas.

### ✨ 2. Modern Canvas Particle & Shader FX (Bio-WebGL Canvas)
An interactive GPU-accelerated WebGL 3D particle system running up to **8,000+ particles** driven by custom GLSL vertex and fragment shaders:
* **Pulse Synchronization (`u_pulse`)**: Particles swell outward on every systolic rPPG heartbeat.
* **Respiration Undulation (`u_breathing`)**: The entire particle matrix breathes in sync with thoracic/abdominal waves.
* **Audio Spectral Energy (`u_audio`)**: Particle sizes and wave heights dance to the 40Hz audio synthesizer.
* **3 Topologies**:
  * 🧬 `Neural Orb`: Fibonacci 3D sphere mimicking prefrontal cortex firing.
  * 🌀 `Vortex Swarm`: Dual-toroidal cosmic particle stream.
  * 🌐 `Quantum Field`: 3D wave mesh responding to harmonic frequencies.
* **Focus Meditation View**: Click one button to expand the particle field into an interactive full-screen canvas with gravitational mouse-attraction and repulsion physics.

### 🫁 3. Dual-Trace Respiration Waveforms
* Canvas oscilloscope displaying dual real-time traces:
  * **Cyan Line**: Upper Thoracic Expansion
  * **Emerald Line**: Lower Abdominal Expansion
* Live **Breathing Mode Badge**: Dynamically indicates `DIAPHRAGMATIC (Vagus Active)` vs `CLAVICULAR (Sympathetic Surge)` with exact real-time TAR calculation.

### 🛡️ 4. Anti-RSD (Rejection Sensitive Dysphoria) Design
Up to 99% of people with ADHD experience extreme sensitivity to perceived failure. FocusPulse eliminates:
* ❌ No loud warning beeps or red error dialogues.
* ❌ No punitive messages (*"You are distracted!"*).
* ✅ Ambient peripheral lighting (cyan vignette).
* ✅ Empowering prompts (*"Ready to crush one tiny step?"*).

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Contactless Sensing** | Presage SmartSpectra SDK (`@smartspectra/node-sdk` adapter + client-side rPPG vision engine) |
| **Neuro-Audio Engine** | Web Audio API (Oscillators, GainNodes, BiquadFilters, ChannelMerger, AnalyserNode) |
| **GPU Visuals & Shaders**| WebGL, GLSL (Custom Vertex & Fragment Shaders), HTML5 Canvas |
| **Backend & Runtime** | Node.js (v20+), Native HTTP streaming server |
| **Containerization** | Docker (`node:20-alpine` multi-stage, zero-bloat footprint) |
| **Cloud Infrastructure** | **Google Cloud Run** (Fully managed serverless, auto-scaling, managed HTTPS) |
| **Hardware Integration** | Standard Webcams, Web Bluetooth API (`0x180D` Heart Rate GATT service for optional smartwatch pairing) |

---

## 🚀 Dockerizing & Deploying to Google Cloud Run

To make FocusPulse instantly accessible anywhere without local build headaches, we containerized the entire stack and deployed it to **Google Cloud Run**:

### 1. Minimal Production `Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy application assets
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY style.css ./
COPY src/ ./src/

# Google Cloud Run injects PORT (defaults to 8080)
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

# Built-in container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["node", "server.js"]
```

### 2. Building & Pushing to Google Artifact Registry
```bash
# 1. Authenticate with Google Cloud Service Account
gcloud auth activate-service-account --key-file=adhd.json
gcloud config set project adhd-9999

# 2. Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

# 3. Build & push container image
docker build -t focuspulse:latest .
docker tag focuspulse:latest us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest
docker push us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest

# 4. Deploy to Google Cloud Run
gcloud run deploy focuspulse \
  --image us-central1-docker.pkg.dev/adhd-9999/cloud-run-source-deploy/focuspulse:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080
```

Because Cloud Run provisions Google-managed SSL (`https://`), browser security requirements for `navigator.mediaDevices.getUserMedia` (Webcam access), Web Audio API, and Web Bluetooth work flawlessly out of the box in production!

---

## 🎮 Try It Yourself!

You can test FocusPulse right now in your browser without needing to clone or install anything:

👉 **[https://focuspulse-760833501708.us-central1.run.app](https://focuspulse-760833501708.us-central1.run.app)**

### What to Explore:
1. **Clinical Scenario Switcher**: Click through the presets on the right panel (**Mind-Wandering**, **Task Paralysis**, **Clavicular Hyperventilation**, **Agitated Restlessness**) to see how the bio-adaptive interventions respond instantly.
2. **Dual-Trace Respiration Waves**: Watch the Cyan (Upper Chest) and Emerald (Lower Abdomen) waveforms undulate and see the Thoracoabdominal Ratio (TAR) calculate live.
3. **Audio Studio**: Toggle between **40Hz Isochronic Pulses**, **Binaural Beats**, and **Brownian Noise Masking** while watching the real-time FFT spectrum bars.
4. **GPU Particle Field**: Switch between the **Neural Orb** and **Vortex Swarm**, or enter **Focus Meditation View** to interact with 8,000 GPU particles using your mouse.
5. **Live Webcam rPPG Mode**: Click **"Enable Camera rPPG"** to run local computer vision face-tracking, blink detection, and optical pulse extraction directly from your camera!

---

## 💡 What We Learned & What's Next

Building FocusPulse reinforced that **the future of assistive neurodivergent technology must be ambient, contactless, and compassionate**. 

When we remove the friction of remembering to charge a wearable, eliminate sensory discomfort, and replace punitive alerts with subtle peripheral bio-cues, we don't just build a productivity tool—we build a genuine co-pilot that honors how the ADHD brain actually works.

*Special thanks to Presage Technologies for the SmartSpectra SDK and Google Cloud for seamless serverless hosting on Cloud Run!*

---

*Found this project helpful or building in neurodiversity tech? Drop your thoughts, questions, or feedback in the comments below!* 👇
