/**
 * FocusPulse - Modern WebGL Canvas Particle & Shader FX Engine
 * 
 * High-performance GPU-accelerated particle system and GLSL shader pipeline.
 * Reacts in real time to:
 * - Cardiac Pulse (rPPG waveform expansion)
 * - Thoracic Respiration (expansion & contraction wave)
 * - Web Audio API Engine (40Hz Gamma beats & spectral energy)
 * - ADHD Cognitive States (Flow, Inattention, Overwhelm, Restlessness)
 * - Mouse Pointer Gravitational Physics
 */

export class VisualizerFX {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.gl = null;
    this.program = null;
    this.animId = null;

    // System Settings
    this.numParticles = 8000;
    this.topology = 'NEURAL_ORB'; // 'NEURAL_ORB', 'VORTEX_SWARM', 'QUANTUM_FIELD'
    this.mode = 'BACKGROUND';    // 'BACKGROUND', 'FOCUS_VIEW'
    this.sensitivity = 1.0;

    // Bio-Telemetry Uniform Values
    this.uniforms = {
      time: 0,
      pulse: 0,
      breathing: 0,
      state: 0,           // 0: Flow, 1: Inattention, 2: Overwhelm, 3: Breathing, 4: Restless
      audioEnergy: 0,
      mouse: [0.5, 0.5],
      resolution: [window.innerWidth, window.innerHeight],
      colorA: [0.02, 0.71, 0.83], // Cyan
      colorB: [0.38, 0.40, 0.94], // Indigo
      colorC: [0.06, 0.72, 0.50]  // Emerald
    };

    // Mouse Tracking
    this.mouseTarget = [0.5, 0.5];
    this.isMouseDown = false;

    // Buffers & Attributes
    this.positions = null;
    this.basePositions = null;
    this.velocities = null;
    this.particleBuffer = null;

    this.initGL();
    this.setupListeners();
  }

  initGL() {
    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      preserveDrawingBuffer: false
    });

    if (!this.gl) {
      console.warn('WebGL not supported; falling back to 2D Canvas');
      this.initFallback2D();
      return;
    }

    this.resize();
    this.createShaders();
    this.initParticles();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.uniforms.resolution = [this.canvas.width, this.canvas.height];
    }
  }

  createShaders() {
    const gl = this.gl;

    // Vertex Shader (Computes 3D orbital dynamics & bio-pulse displacements)
    const vsSource = `
      attribute vec3 a_position;
      attribute vec3 a_velocity;
      attribute float a_phase;

      uniform float u_time;
      uniform float u_pulse;
      uniform float u_breathing;
      uniform float u_audio;
      uniform float u_state;
      uniform vec2 u_mouse;
      uniform vec2 u_resolution;
      uniform int u_topology;

      varying vec3 v_color;
      varying float v_alpha;

      // Color palettes by ADHD state
      uniform vec3 u_colorA;
      uniform vec3 u_colorB;
      uniform vec3 u_colorC;

      void main() {
        vec3 pos = a_position;
        float t = u_time * 0.8 + a_phase;

        // 1. TOPOLOGY DYNAMICS
        if (u_topology == 0) {
          // NEURAL ORB (Fibonacci 3D sphere)
          float r = length(pos);
          float breatheScale = 1.0 + u_breathing * 0.18 + u_pulse * 0.14 + u_audio * 0.25;
          
          // Organic harmonic rotation
          float angle = t * 0.3;
          mat3 rot = mat3(
            cos(angle), 0.0, sin(angle),
            0.0, 1.0, 0.0,
            -sin(angle), 0.0, cos(angle)
          );
          pos = rot * pos * breatheScale;
          pos.y += sin(pos.x * 2.5 + t) * 0.06;

        } else if (u_topology == 1) {
          // VORTEX SWARM (Dual Torus)
          float theta = atan(pos.y, pos.x) + t * (0.6 + u_pulse * 0.4);
          float rad = length(pos.xy) + sin(t * 2.0 + pos.z * 4.0) * (0.08 + u_audio * 0.15);
          pos.x = cos(theta) * rad;
          pos.y = sin(theta) * rad;
          pos.z += sin(theta * 3.0 + t) * 0.15 * (1.0 + u_breathing * 0.3);

        } else {
          // QUANTUM FIELD (Undulating audio mesh)
          float wave = sin(pos.x * 4.0 + t * 2.0) * cos(pos.y * 4.0 + t * 1.5);
          pos.z += wave * (0.2 + u_audio * 0.4 + u_pulse * 0.2);
          pos.x += cos(pos.y * 3.0 + t) * 0.04;
        }

        // 2. ADHD STATE-SPECIFIC TURBULENCE
        if (u_state > 3.5) {
          // Restlessness: Erratic jitter
          pos += a_velocity * sin(u_time * 20.0 + a_phase) * 0.12;
        } else if (u_state > 1.5 && u_state < 2.5) {
          // Task Paralysis: Crystalline freezing with micro-oscillations
          pos += sin(pos * 15.0 + u_time * 0.4) * 0.015;
        }

        // 3. MOUSE INTERACTION (Gravitational repulsion / pull)
        vec2 m = (u_mouse - 0.5) * 2.0;
        m.y = -m.y;
        vec2 diff = pos.xy - m;
        float dist = length(diff);
        if (dist < 0.6) {
          float force = (0.6 - dist) / 0.6;
          pos.xy += normalize(diff) * force * 0.18;
        }

        // Perspective projection
        float aspect = u_resolution.x / u_resolution.y;
        vec3 finalPos = pos;
        finalPos.x /= aspect;

        gl_Position = vec4(finalPos.xy, finalPos.z * 0.5, 1.0);

        // Dynamic Point Size based on pulse and audio
        float baseSize = 3.5;
        gl_PointSize = baseSize * (1.0 + u_pulse * 0.8 + u_audio * 1.2) * (1.2 / (1.0 + finalPos.z * 0.4));

        // 4. COLOR INTERPOLATION
        float colorMix = sin(a_phase + u_time) * 0.5 + 0.5;
        vec3 baseCol = mix(u_colorA, u_colorB, colorMix);
        if (u_pulse > 0.3) {
          baseCol = mix(baseCol, u_colorC, u_pulse * 0.7);
        }
        v_color = baseCol;
        v_alpha = 0.55 + u_pulse * 0.35 + u_audio * 0.3;
      }
    `;

    // Fragment Shader (Soft glowing anti-aliased particle discs)
    const fsSource = `
      precision mediump float;
      varying vec3 v_color;
      varying float v_alpha;

      void main() {
        // Render smooth circular particle with soft radial bloom
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        // Gaussian glow falloff
        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 1.8);

        gl_FragColor = vec4(v_color * (1.0 + intensity * 0.5), v_alpha * intensity);
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader link failed:', gl.getProgramInfoLog(this.program));
    }
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  initParticles() {
    const gl = this.gl;
    const n = this.numParticles;

    this.positions = new Float32Array(n * 3);
    this.velocities = new Float32Array(n * 3);
    const phases = new Float32Array(n);

    // Distribute particles across a 3D Fibonacci sphere
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio

    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const r = 0.45 + (Math.random() - 0.5) * 0.12;
      const x = Math.cos(theta) * radius * r;
      const z = Math.sin(theta) * radius * r;

      this.positions[i * 3 + 0] = x;
      this.positions[i * 3 + 1] = y * r;
      this.positions[i * 3 + 2] = z;

      this.velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      phases[i] = Math.random() * Math.PI * 2;
    }

    // Interleave data: [x, y, z, vx, vy, vz, phase] -> 7 floats per vertex
    const vertexData = new Float32Array(n * 7);
    for (let i = 0; i < n; i++) {
      vertexData[i * 7 + 0] = this.positions[i * 3 + 0];
      vertexData[i * 7 + 1] = this.positions[i * 3 + 1];
      vertexData[i * 7 + 2] = this.positions[i * 3 + 2];
      vertexData[i * 7 + 3] = this.velocities[i * 3 + 0];
      vertexData[i * 7 + 4] = this.velocities[i * 3 + 1];
      vertexData[i * 7 + 5] = this.velocities[i * 3 + 2];
      vertexData[i * 7 + 6] = phases[i];
    }

    this.particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    // Setup attributes
    gl.useProgram(this.program);
    const stride = 7 * 4; // 7 floats * 4 bytes

    const aPos = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);

    const aVel = gl.getAttribLocation(this.program, 'a_velocity');
    gl.enableVertexAttribArray(aVel);
    gl.vertexAttribPointer(aVel, 3, gl.FLOAT, false, stride, 3 * 4);

    const aPhase = gl.getAttribLocation(this.program, 'a_phase');
    gl.enableVertexAttribArray(aPhase);
    gl.vertexAttribPointer(aPhase, 1, gl.FLOAT, false, stride, 6 * 4);

    // Enable Blending for glowing particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for bioluminescent glow
  }

  setupListeners() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e) => {
      this.mouseTarget[0] = e.clientX / window.innerWidth;
      this.mouseTarget[1] = e.clientY / window.innerHeight;
    });

    window.addEventListener('mousedown', () => {
      this.isMouseDown = true;
    });
    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
  }

  setTopology(type) {
    this.topology = type;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'FOCUS_VIEW') {
      this.canvas.classList.add('fx-focus-view');
    } else {
      this.canvas.classList.remove('fx-focus-view');
    }
  }

  /**
   * Updates bio-adaptive inputs from SmartSpectra and Audio Engine
   */
  updateBioInputs(pulseWave, respWave, adhdStateKey, audioEnergy) {
    this.uniforms.pulse = Math.max(0, pulseWave);
    this.uniforms.breathing = respWave;
    this.uniforms.audioEnergy = audioEnergy || 0;

    // Map ADHD state to numerical uniform & colors
    switch (adhdStateKey) {
      case 'STATE_INATTENTION':
        this.uniforms.state = 1.0;
        this.uniforms.colorA = [0.02, 0.71, 0.83]; // Cyan
        this.uniforms.colorB = [0.55, 0.36, 0.96]; // Lavender/Purple
        this.uniforms.colorC = [0.22, 0.74, 0.97]; // Sky
        break;
      case 'STATE_OVERWHELM_PARALYSIS':
        this.uniforms.state = 2.0;
        this.uniforms.colorA = [0.96, 0.62, 0.04]; // Amber
        this.uniforms.colorB = [0.95, 0.25, 0.37]; // Coral
        this.uniforms.colorC = [1.00, 0.84, 0.00]; // Gold
        break;
      case 'STATE_SHALLOW_BREATHING':
        this.uniforms.state = 3.0;
        this.uniforms.colorA = [0.22, 0.74, 0.97]; // Sky
        this.uniforms.colorB = [0.06, 0.72, 0.50]; // Emerald
        this.uniforms.colorC = [0.02, 0.71, 0.83]; // Cyan
        break;
      case 'STATE_RESTLESS':
        this.uniforms.state = 4.0;
        this.uniforms.colorA = [0.95, 0.25, 0.37]; // Rose
        this.uniforms.colorB = [0.96, 0.62, 0.04]; // Amber
        this.uniforms.colorC = [0.55, 0.36, 0.96]; // Violet
        break;
      case 'STATE_FLOW_STIMMING':
        this.uniforms.state = 0.5;
        this.uniforms.colorA = [0.51, 0.55, 0.97]; // Indigo
        this.uniforms.colorB = [0.06, 0.72, 0.50]; // Emerald
        this.uniforms.colorC = [0.02, 0.71, 0.83]; // Cyan
        break;
      case 'STATE_FLOW':
      default:
        this.uniforms.state = 0.0;
        this.uniforms.colorA = [0.02, 0.71, 0.83]; // Cyan
        this.uniforms.colorB = [0.38, 0.40, 0.94]; // Indigo
        this.uniforms.colorC = [0.06, 0.72, 0.50]; // Emerald
        break;
    }
  }

  start() {
    const render = (time) => {
      this.render(time * 0.001);
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  render(t) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Smooth mouse interpolation
    this.uniforms.mouse[0] += (this.mouseTarget[0] - this.uniforms.mouse[0]) * 0.08;
    this.uniforms.mouse[1] += (this.mouseTarget[1] - this.uniforms.mouse[1]) * 0.08;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Topology index
    let topoIdx = 0;
    if (this.topology === 'VORTEX_SWARM') topoIdx = 1;
    if (this.topology === 'QUANTUM_FIELD') topoIdx = 2;

    // Bind Uniforms
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), t);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_pulse'), this.uniforms.pulse * this.sensitivity);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_breathing'), this.uniforms.breathing);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_audio'), this.uniforms.audioEnergy * this.sensitivity);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_state'), this.uniforms.state);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_topology'), topoIdx);
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_mouse'), this.uniforms.mouse[0], this.uniforms.mouse[1]);
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), this.canvas.width, this.canvas.height);

    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colorA'), this.uniforms.colorA);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colorB'), this.uniforms.colorB);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_colorC'), this.uniforms.colorC);

    // Draw Particles
    gl.drawArrays(gl.POINTS, 0, this.numParticles);
  }

  initFallback2D() {
    const ctx = this.canvas.getContext('2d');
    const render2D = (time) => {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const r = 100 + this.uniforms.pulse * 30 + Math.sin(time * 0.002) * 20;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.stroke();

      this.animId = requestAnimationFrame(render2D);
    };
    this.animId = requestAnimationFrame(render2D);
  }
}
