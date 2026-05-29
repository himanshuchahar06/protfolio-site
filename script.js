// ==========================================
// 1. AUDIO SYNTHESIS ENGINE (Web Audio API)
// ==========================================
class MysticAudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        
        // Continuous Synthesizers
        this.sanctumHum = null;
        this.sanctumFilter = null;
        
        this.leftShieldSynth = null;
        this.rightShieldSynth = null;
        
        this.portalSound = null;
        this.portalFilter = null;
        
        this.isPlayingHum = false;
        this.isPlayingPortal = false;
        
        this.masterVolume = 0.4; // Default volume
    }

    init() {
        if (this.ctx) return;
        
        // Initialize AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        
        this.startSanctumHum();
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
        }
    }

    // A low-frequency detuned ambient drone for the sanctum
    startSanctumHum() {
        if (this.isPlayingHum) return;
        this.isPlayingHum = true;

        this.sanctumFilter = this.ctx.createBiquadFilter();
        this.sanctumFilter.type = 'lowpass';
        this.sanctumFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
        this.sanctumFilter.Q.setValueAtTime(1, this.ctx.currentTime);

        const humOsc1 = this.ctx.createOscillator();
        const humOsc2 = this.ctx.createOscillator();
        const humGain = this.ctx.createGain();

        humOsc1.type = 'sawtooth';
        humOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
        
        humOsc2.type = 'sine';
        humOsc2.frequency.setValueAtTime(55.3, this.ctx.currentTime); // Detuned

        humGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

        humOsc1.connect(this.sanctumFilter);
        humOsc2.connect(this.sanctumFilter);
        this.sanctumFilter.connect(humGain);
        humGain.connect(this.masterGain);

        humOsc1.start();
        humOsc2.start();

        // Keep references to prevent GC
        this.sanctumHum = { osc1: humOsc1, osc2: humOsc2, gain: humGain };
    }

    updateSanctumHum(activity) {
        if (!this.sanctumFilter) return;
        // Modulate filter cutoff based on movement speed
        const cutoff = 120 + (activity * 300);
        this.sanctumFilter.frequency.setTargetAtTime(Math.min(cutoff, 800), this.ctx.currentTime, 0.2);
    }

    // Resonant shield humming modulated by palm translation speed
    startShieldHum(hand) {
        const isLeft = hand === 'Left';
        if (isLeft && this.leftShieldSynth) return;
        if (!isLeft && this.rightShieldSynth) return;

        const osc = this.ctx.createOscillator();
        const bandpass = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, this.ctx.currentTime); // Low A

        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(220, this.ctx.currentTime);
        bandpass.Q.setValueAtTime(6, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.3); // Smooth fade-in

        osc.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        const synth = { osc, bandpass, gain };
        if (isLeft) this.leftShieldSynth = synth;
        else this.rightShieldSynth = synth;
    }

    updateShieldHum(hand, velocity) {
        const synth = hand === 'Left' ? this.leftShieldSynth : this.rightShieldSynth;
        if (!synth) return;

        // Map velocity to bandpass filter frequency and volume
        const freq = 200 + (velocity * 800);
        const volume = 0.2 + Math.min(0.6, velocity * 1.5);
        const pitch = 110 + (velocity * 50);

        synth.bandpass.frequency.setTargetAtTime(Math.min(freq, 2000), this.ctx.currentTime, 0.1);
        synth.osc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.15);
        synth.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }

    stopShieldHum(hand) {
        const isLeft = hand === 'Left';
        const synth = isLeft ? this.leftShieldSynth : this.rightShieldSynth;
        if (!synth) return;

        synth.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        setTimeout(() => {
            try {
                synth.osc.stop();
                synth.osc.disconnect();
                synth.bandpass.disconnect();
                synth.gain.disconnect();
            } catch(e) {}
            if (isLeft) this.leftShieldSynth = null;
            else this.rightShieldSynth = null;
        }, 200);
    }

    // Lightning electricity crackles (short bandpass filtered noise bursts)
    playLightningCrackle() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.08; // 80ms short bursts
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000 + Math.random() * 2000, this.ctx.currentTime);
        filter.Q.setValueAtTime(8, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    // Tao whip metallic energy whoosh
    playWhipWhoosh(speed) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800 + (speed * 1000), this.ctx.currentTime + 0.25);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    // Time loop ticking mechanical gears
    playTimeTick() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, this.ctx.currentTime); // High pitch metallic click
        
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03); // Super fast decay

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
    }

    // Portal continuous wind-roar and glitter
    startPortalSound() {
        if (this.isPlayingPortal) return;
        this.isPlayingPortal = true;

        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }

        this.portalNoise = this.ctx.createBufferSource();
        this.portalNoise.buffer = buffer;
        this.portalNoise.loop = true;

        this.portalFilter = this.ctx.createBiquadFilter();
        this.portalFilter.type = 'lowpass';
        this.portalFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
        this.portalFilter.Q.setValueAtTime(3, this.ctx.currentTime);

        this.portalGain = this.ctx.createGain();
        this.portalGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.portalGain.gain.linearRampToValueAtTime(0.65, this.ctx.currentTime + 1.0); // Slow fade-in

        this.portalNoise.connect(this.portalFilter);
        this.portalFilter.connect(this.portalGain);
        this.portalGain.connect(this.masterGain);

        this.portalNoise.start();

        // 6Hz LFO to create spinning wind effect
        this.portalLFO = this.ctx.createOscillator();
        this.portalLFOGain = this.ctx.createGain();
        this.portalLFO.frequency.setValueAtTime(6, this.ctx.currentTime);
        this.portalLFOGain.gain.setValueAtTime(120, this.ctx.currentTime);

        this.portalLFO.connect(this.portalLFOGain);
        this.portalLFOGain.connect(this.portalFilter.frequency);
        this.portalLFO.start();
    }

    updatePortalSound(scale) {
        if (!this.portalFilter || !this.portalGain) return;
        const targetFreq = 300 + (scale * 1200);
        this.portalFilter.frequency.setTargetAtTime(Math.min(targetFreq, 3000), this.ctx.currentTime, 0.1);
        this.portalGain.gain.setTargetAtTime(0.35 + Math.min(0.55, scale * 0.8), this.ctx.currentTime, 0.25);
    }

    stopPortalSound() {
        if (!this.isPlayingPortal) return;
        this.isPlayingPortal = false;

        if (this.portalGain) {
            this.portalGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
            setTimeout(() => {
                try {
                    if (this.portalNoise) {
                        this.portalNoise.stop();
                        this.portalNoise.disconnect();
                        this.portalNoise = null;
                    }
                    if (this.portalLFO) {
                        this.portalLFO.stop();
                        this.portalLFO.disconnect();
                        this.portalLFO = null;
                    }
                    this.portalFilter.disconnect();
                    this.portalGain.disconnect();
                } catch(e) {}
            }, 500);
        }
    }

    // Shockwave explosion (sawtooth sweep + distortion + huge low bass boom)
    playShockwaveExplosion() {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // High crackling blast
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.8);

        // Low cinematic boom
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(120, this.ctx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 1.2);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 1.5);

        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

        // Add distortion wave-shaper
        const distortion = this.ctx.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(100);

        osc.connect(distortion);
        distortion.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        subOsc.start();
        
        osc.stop(this.ctx.currentTime + 1.9);
        subOsc.stop(this.ctx.currentTime + 1.9);
    }

    makeDistortionCurve(amount) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }
}

const audioManager = new MysticAudioManager();


// ==========================================
// 2. DOUBLE EXPONENTIAL LANDMARK SMOOTHER
// ==========================================
class LandmarkSmoother {
    constructor() {
        this.history = { Left: null, Right: null };
        this.alpha = 0.3; // Default smoothing factor (adjustable by UI)
    }

    setSmoothing(factor) {
        // Map 5%-95% slider to 0.05 (ultra-smooth/laggy) - 0.7 (highly tracking/raw)
        this.alpha = 0.05 + (factor / 100) * 0.65;
    }

    smooth(hand, rawMarks) {
        if (!rawMarks || rawMarks.length !== 21) {
            this.history[hand] = null;
            return rawMarks;
        }

        // Initialize history if missing
        if (!this.history[hand]) {
            this.history[hand] = rawMarks.map(pt => ({
                x: pt.x,
                y: pt.y,
                z: pt.z,
                vx: 0, vy: 0, vz: 0 // Velocity history
            }));
            return rawMarks;
        }

        const smoothed = [];
        const prev = this.history[hand];
        const a = this.alpha;

        for (let i = 0; i < 21; i++) {
            const r = rawMarks[i];
            const p = prev[i];

            // Double Exponential / Holt-Winters-like smoothing
            const sx = p.x + a * (r.x - p.x);
            const sy = p.y + a * (r.y - p.y);
            const sz = p.z + a * (r.z - p.z);

            // Compute velocities / translations
            const vx = sx - p.x;
            const vy = sy - p.y;
            const vz = sz - p.z;

            smoothed.push({ x: sx, y: sy, z: sz, vx, vy, vz });
        }

        this.history[hand] = smoothed;
        return smoothed;
    }
}


// ==========================================
// 3. HAND TRACKING ENGINE (MediaPipe)
// ==========================================
class HandTracker {
    constructor(videoElement, canvasElement, landmarkSmoother) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.smoother = landmarkSmoother;
        
        this.showLandmarks = false;
        this.landmarks = { Left: null, Right: null };
        this.gestures = {
            Left: { type: 'None', velocity: 0, palmCenter: null, pitch: 0, yaw: 0, roll: 0 },
            Right: { type: 'None', velocity: 0, palmCenter: null, pitch: 0, yaw: 0, roll: 0 }
        };
        
        this.onFrameCallback = null;
        this.videoWidth = 1280;
        this.videoHeight = 720;

        // MediaPipe Hands Init
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.75,
            minTrackingConfidence: 0.75
        });
        
        this.hands.onResults(this.onResults.bind(this));
        
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 1280,
            height: 720
        });
    }

    start() {
        return this.camera.start();
    }

    setDebugView(show) {
        this.showLandmarks = show;
    }

    onResults(results) {
        if (this.canvasElement.width !== results.image.width) {
            this.canvasElement.width = results.image.width;
            this.canvasElement.height = results.image.height;
            this.videoWidth = results.image.width;
            this.videoHeight = results.image.height;
        }

        // Reset current tracking state
        this.landmarks.Left = null;
        this.landmarks.Right = null;
        this.gestures.Left.type = 'None';
        this.gestures.Right.type = 'None';

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Draw Mirror Image of Webcam to output-canvas
        this.ctx.translate(this.canvasElement.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Draw MediaPipe Bounding Skeleton only if debugging is toggled ON
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const rawMarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // Mirror mapping correction: MediaPipe Left is user's right and vice versa
                const hand = handedness.label === 'Left' ? 'Right' : 'Left';
                
                // Apply Double Exponential Smoothing Filter
                const smoothedMarks = this.smoother.smooth(hand, rawMarks);
                
                this.landmarks[hand] = smoothedMarks;
                this.gestures[hand] = this.classifyGesture(smoothedMarks);

                if (this.showLandmarks) {
                    this.ctx.save();
                    // Draw MediaPipe default drawing skeleton on top of mirrored webcam
                    drawConnectors(this.ctx, rawMarks, HAND_CONNECTIONS, { color: '#ff8c00', lineWidth: 2 });
                    drawLandmarks(this.ctx, rawMarks, { color: '#ffffff', lineWidth: 1, radius: 3 });
                    this.ctx.restore();
                }
            }
        } else {
            // No hands detected
            this.smoother.smooth('Left', null);
            this.smoother.smooth('Right', null);
        }
        this.ctx.restore();
        
        if (this.onFrameCallback) {
            this.onFrameCallback(this.landmarks, this.gestures);
        }
    }

    classifyGesture(marks) {
        if (!marks || marks.length !== 21) return { type: 'None', velocity: 0 };

        // 1. Estimate Palm Bounding Center
        const wrist = marks[0];
        const indexBase = marks[5];
        const pinkyBase = marks[17];
        const palmCenter = {
            x: (wrist.x + indexBase.x + pinkyBase.x) / 3,
            y: (wrist.y + indexBase.y + pinkyBase.y) / 3,
            z: (wrist.z + indexBase.z + pinkyBase.z) / 3
        };

        // 2. Compute Hand Bounding Normal & Rotations (Yaw, Pitch, Roll)
        // Horizontal hand span vector
        const vH = { x: pinkyBase.x - indexBase.x, y: pinkyBase.y - indexBase.y, z: pinkyBase.z - indexBase.z };
        // Vertical hand span vector
        const vV = { x: marks[9].x - wrist.x, y: marks[9].y - wrist.y, z: marks[9].z - wrist.z };
        
        // Cross product for palm normal vector
        const norm = {
            x: vH.y * vV.z - vH.z * vV.y,
            y: vH.z * vV.x - vH.x * vV.z,
            z: vH.x * vV.y - vH.y * vV.x
        };
        const len = Math.sqrt(norm.x*norm.x + norm.y*norm.y + norm.z*norm.z);
        if (len > 0) { norm.x /= len; norm.y /= len; norm.z /= len; }

        const yaw = Math.atan2(norm.x, norm.z);
        const pitch = Math.atan2(norm.y, norm.z);
        const roll = Math.atan2(vH.y, vH.x);

        // Calculate translation velocity of the palm
        let velocitySum = 0;
        marks.forEach(pt => {
            velocitySum += Math.sqrt(pt.vx*pt.vx + pt.vy*pt.vy + pt.vz*pt.vz);
        });
        const velocity = velocitySum / 21;

        // 3. Classify finger extension states
        // Check tip y-coordinates against primary knuckle coordinates (webcam space y is reversed)
        const isIndexOpen = marks[8].y < marks[6].y;
        const isMiddleOpen = marks[12].y < marks[10].y;
        const isRingOpen = marks[16].y < marks[14].y;
        const isPinkyOpen = marks[20].y < marks[18].y;

        // Distance thumb tip (4) to index base (5)
        const thumbDist = Math.sqrt(Math.pow(marks[4].x - marks[5].x, 2) + Math.pow(marks[4].y - marks[5].y, 2));
        const isThumbOpen = thumbDist > 0.07;

        // Distance thumb tip to index tip for Pinch
        const pinchDist = Math.sqrt(Math.pow(marks[4].x - marks[8].x, 2) + Math.pow(marks[4].y - marks[8].y, 2));

        let type = 'None';
        
        if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
            type = 'Open';
        } else if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
            type = 'Peace'; // Time loop Loop trigger
        } else if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
            type = 'Point'; // Lightning bolt / Sparkler trigger
        } else if (pinchDist < 0.045 && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
            type = 'Pinch'; // Tao Whip trigger
        } else if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
            type = 'Fist'; // Energy charge trigger
        }

        return {
            type,
            velocity,
            palmCenter,
            yaw,
            pitch,
            roll,
            indexTip: marks[8],
            thumbTip: marks[4]
        };
    }
}


// ==========================================
// 4. VFX PARTICLES ENGINE & CANVAS RENDERER
// ==========================================
class VFXManager {
    constructor(threeContainer, vfxCanvas) {
        this.vfxCanvas = vfxCanvas;
        this.ctx = vfxCanvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Active visual toggles
        this.showWebcam = true;
        this.timeLoopActive = false;
        
        // Pre-allocated Particle Physics Pool (Optimal garbage collection footprint)
        this.maxParticles = 3000;
        this.particles = [];
        this.activeParticleCount = 0;
        this.initParticlePool();
        
        // Eldritch spell states
        this.shieldRotations = { Left: 0, Right: 0 };
        this.whipCurves = { Left: [], Right: [] };
        
        this.fistCharges = {
            Left: { value: 0, sparksCrackling: false },
            Right: { value: 0, sparksCrackling: false }
        };

        // WebGL Three.js Scene Setup (Portal Gateway)
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 6;
        
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.domElement.style.pointerEvents = 'none';
        threeContainer.appendChild(this.renderer.domElement);

        this.initThreeJSEffects();

        window.addEventListener('resize', this.onResize.bind(this));
        this.onResize();
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.vfxCanvas.width = this.width;
        this.vfxCanvas.height = this.height;
        
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
    }

    setParticlesLimit(limit) {
        this.maxParticles = parseInt(limit);
        this.initParticlePool();
    }

    initParticlePool() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: 0, y: 0, vx: 0, vy: 0,
                color: '', size: 0, life: 0, maxLife: 0,
                gravity: 0, drag: 0, active: false
            });
        }
        this.activeParticleCount = 0;
    }

    // Pre-allocated array recycling
    spawnParticle(x, y, vx, vy, colorType, size, maxLife, gravity = 0, drag = 0.98) {
        // Look for inactive slot
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) {
                p.active = true;
                p.x = x; p.y = y;
                p.vx = vx; p.vy = vy;
                p.color = colorType;
                p.size = size;
                p.life = maxLife;
                p.maxLife = maxLife;
                p.gravity = gravity;
                p.drag = drag;
                this.activeParticleCount++;
                return;
            }
        }
    }

    initThreeJSEffects() {
        // Portal buffer geometry particle field
        this.portalParticleCount = 1800;
        this.portalGeometry = new THREE.BufferGeometry();
        this.portalPositions = new Float32Array(this.portalParticleCount * 3);
        this.portalVelocities = new Float32Array(this.portalParticleCount * 3);
        this.portalLifetimes = new Float32Array(this.portalParticleCount);
        
        const colors = new Float32Array(this.portalParticleCount * 3);
        const baseColor = new THREE.Color(0xffaa00);

        for (let i = 0; i < this.portalParticleCount; i++) {
            this.resetPortalParticle(i);
            this.portalLifetimes[i] = Math.random() * 2;

            const mix = Math.random();
            const sparkColor = baseColor.clone().lerp(new THREE.Color(0xffffff), mix * 0.4);
            colors[i*3] = sparkColor.r;
            colors[i*3+1] = sparkColor.g;
            colors[i*3+2] = sparkColor.b;
        }

        this.portalGeometry.setAttribute('position', new THREE.BufferAttribute(this.portalPositions, 3));
        this.portalGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Procedural Star glow CanvasTexture
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 32; pCanvas.height = 32;
        const pCtx = pCanvas.getContext('2d');
        const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.25, 'rgba(255,140,0,1)');
        grad.addColorStop(0.6, 'rgba(180,50,0,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        pCtx.fillStyle = grad;
        pCtx.fillRect(0, 0, 32, 32);
        const sparkTexture = new THREE.CanvasTexture(pCanvas);

        const pMat = new THREE.PointsMaterial({
            size: 0.28,
            map: sparkTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        this.portalGroup = new THREE.Group();
        this.portalParticles = new THREE.Points(this.portalGeometry, pMat);
        this.portalGroup.add(this.portalParticles);

        // Core orange glowing ring mesh
        const ringGeo = new THREE.TorusGeometry(2.5, 0.08, 16, 80);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        this.portalRing = new THREE.Mesh(ringGeo, ringMat);
        this.portalGroup.add(this.portalRing);

        // 3. Dimensional Starry Void Backdrop (Looking into deep space cosmos)
        const voidGeo = new THREE.CircleGeometry(2.45, 64);
        
        // Procedural stars backdrop
        const voidCanvas = document.createElement('canvas');
        voidCanvas.width = 512; voidCanvas.height = 512;
        const voidCtx = voidCanvas.getContext('2d');
        voidCtx.fillStyle = '#010006';
        voidCtx.fillRect(0,0,512,512);
        
        // Add random cosmic stars
        voidCtx.fillStyle = '#ffffff';
        for (let i = 0; i < 180; i++) {
            const size = Math.random() * 2;
            voidCtx.globalAlpha = 0.3 + Math.random() * 0.7;
            voidCtx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
        }
        // Nebula swirl glow
        const nebGrad = voidCtx.createRadialGradient(256, 256, 50, 256, 256, 250);
        nebGrad.addColorStop(0, 'rgba(139, 92, 246, 0.18)');
        nebGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.05)');
        nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
        voidCtx.fillStyle = nebGrad;
        voidCtx.globalAlpha = 1;
        voidCtx.fillRect(0,0,512,512);
        
        const voidTexture = new THREE.CanvasTexture(voidCanvas);
        const voidMat = new THREE.MeshBasicMaterial({
            map: voidTexture,
            transparent: true,
            opacity: 0.98
        });
        this.portalVoid = new THREE.Mesh(voidGeo, voidMat);
        this.portalVoid.position.z = -0.05;
        this.portalGroup.add(this.portalVoid);

        this.portalGroup.visible = false;
        this.scene.add(this.portalGroup);
    }

    resetPortalParticle(i) {
        const theta = Math.random() * Math.PI * 2;
        const r = 2.5 + (Math.random() - 0.5) * 0.28;
        
        this.portalPositions[i*3] = Math.cos(theta) * r;
        this.portalPositions[i*3+1] = Math.sin(theta) * r;
        this.portalPositions[i*3+2] = (Math.random() - 0.5) * 0.4;

        // Tangent spin velocity
        const speed = 1.8 + Math.random() * 2.2;
        this.portalVelocities[i*3] = -Math.sin(theta) * speed;
        this.portalVelocities[i*3+1] = Math.cos(theta) * speed;
        this.portalVelocities[i*3+2] = (Math.random() - 0.5) * 0.6; // spit out forwards

        this.portalLifetimes[i] = 1.0 + Math.random() * 1.5;
    }

    get3DPosition(screenX, screenY, depth = 0.5) {
        const vec = new THREE.Vector3(
            (screenX / this.width) * 2 - 1,
            -(screenY / this.height) * 2 + 1,
            depth
        );
        vec.unproject(this.camera);
        vec.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / vec.z;
        return this.camera.position.clone().add(vec.multiplyScalar(distance));
    }

    updateAndRender(landmarks, gestures) {
        // Delta time scaling for Eye of Agamotto time loop (slows engine down by 4x)
        const dt = this.timeLoopActive ? 0.004 : 0.016; 
        
        // 1. Clear 2D Overlay Canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 2. Reset 3D portal visibility
        this.portalGroup.visible = false;

        let portalActive = false;
        let portalScale = 0;
        
        // Hand statuses for feedback
        let activeLeftSpell = 'None';
        let activeRightSpell = 'None';

        // Process Left & Right hand spells independently
        const processSpell = (hand) => {
            const marks = landmarks[hand];
            if (!marks) return;
            const gesture = gestures[hand];
            
            // Map mirrored MediaPipe coordinate to screen pixel bounds
            const screenX = (1 - gesture.palmCenter.x) * this.width;
            const screenY = gesture.palmCenter.y * this.height;

            // Shield rotation
            this.shieldRotations[hand] -= this.timeLoopActive ? 0.015 : 0.06;

            // 🛡️ SPELL 1: Eldritch Shield (Open Palm)
            if (gesture.type === 'Open') {
                activeLeftSpell = hand === 'Left' ? 'Shield' : activeLeftSpell;
                activeRightSpell = hand === 'Right' ? 'Shield' : activeRightSpell;
                
                audioManager.startShieldHum(hand);
                audioManager.updateShieldHum(hand, gesture.velocity);

                this.draw3DShield(screenX, screenY, gesture.yaw, gesture.pitch, gesture.roll, this.shieldRotations[hand]);
                
                // Embers spinning off the shield edges
                if (Math.random() < 0.35) {
                    const radius = 110;
                    const angle = Math.random() * Math.PI * 2;
                    const sparkX = screenX + Math.cos(angle) * radius;
                    const sparkY = screenY + Math.sin(angle) * radius * 0.8;
                    const speed = 2 + Math.random() * 3;
                    this.spawnParticle(
                        sparkX, sparkY, 
                        -Math.sin(angle) * speed + (Math.random()-0.5)*2,
                        Math.cos(angle) * speed - 1 + (Math.random()-0.5)*2,
                        'orange', 2 + Math.random()*2, 60 + Math.random()*40, 0.05
                    );
                }
            } else {
                audioManager.stopShieldHum(hand);
            }

            // ⚡ SPELL 2: Point (Lightning & Spark Trails)
            if (gesture.type === 'Point') {
                activeLeftSpell = hand === 'Left' ? 'Lightning' : activeLeftSpell;
                activeRightSpell = hand === 'Right' ? 'Lightning' : activeRightSpell;

                const tipX = (1 - gesture.indexTip.x) * this.width;
                const tipY = gesture.indexTip.y * this.height;

                // Emits a high density stream of glowing spark trailing the index fingertip
                const count = this.timeLoopActive ? 1 : 4;
                for (let i = 0; i < count; i++) {
                    this.spawnParticle(
                        tipX, tipY,
                        (Math.random() - 0.5) * 8,
                        (Math.random() - 0.5) * 8 - 1,
                        'cyan', 2.5 + Math.random() * 2, 40 + Math.random() * 30, 0.02
                    );
                }

                // Random electric branching lightning bolts shooting up
                if (Math.random() < 0.15) {
                    this.drawLightningBolt(tipX, tipY);
                    audioManager.playLightningCrackle();
                }
            }

            // 🎗️ SPELL 3: Pinch (Tao Whip)
            if (gesture.type === 'Pinch') {
                activeLeftSpell = hand === 'Left' ? 'Tao Whip' : activeLeftSpell;
                activeRightSpell = hand === 'Right' ? 'Tao Whip' : activeRightSpell;

                const thumbX = (1 - gesture.thumbTip.x) * this.width;
                const thumbY = gesture.thumbTip.y * this.height;
                const indexX = (1 - gesture.indexTip.x) * this.width;
                const indexY = gesture.indexTip.y * this.height;
                const midX = (thumbX + indexX) / 2;
                const midY = (thumbY + indexY) / 2;

                this.drawTaoWhip(thumbX, thumbY, indexX, indexY);
                audioManager.playWhipWhoosh(gesture.velocity);

                // Embers floating off whip center
                if (Math.random() < 0.45) {
                    this.spawnParticle(
                        midX, midY,
                        (Math.random() - 0.5) * 5,
                        (Math.random() - 0.5) * 5 - 1.5,
                        'amber', 2 + Math.random() * 3, 50 + Math.random() * 30, 0.08
                    );
                }
            }

            // 👁️ SPELL 4: Peace Sign (Time Loop - Eye of Agamotto)
            if (gesture.type === 'Peace') {
                activeLeftSpell = hand === 'Left' ? 'Time Loop' : activeLeftSpell;
                activeRightSpell = hand === 'Right' ? 'Time Loop' : activeRightSpell;

                this.timeLoopActive = true;
                
                // Clock gears ticking sound periodically
                if (Math.random() < 0.08) {
                    audioManager.playTimeTick();
                }

                this.drawEyeOfAgamotto(screenX, screenY, this.shieldRotations[hand]);

                // Emit slow green sparks floating upwards
                if (Math.random() < 0.35) {
                    this.spawnParticle(
                        screenX + (Math.random()-0.5)*80,
                        screenY + (Math.random()-0.5)*80,
                        (Math.random() - 0.5) * 1.5,
                        -0.5 - Math.random() * 1.0,
                        'green', 3 + Math.random()*2, 100 + Math.random()*50, -0.01 // Rising gravity
                    );
                }
            }

            // ✊ SPELL 5: Closed Fist (Fist Charging)
            if (gesture.type === 'Fist') {
                activeLeftSpell = hand === 'Left' ? 'Power Charge' : activeLeftSpell;
                activeRightSpell = hand === 'Right' ? 'Power Charge' : activeRightSpell;

                const charge = this.fistCharges[hand];
                charge.value = Math.min(100, charge.value + (this.timeLoopActive ? 0.3 : 1.2));
                
                this.drawFistCharge(screenX, screenY, charge.value);

                // Sucks in particles from boundary margins to hand center
                if (charge.value < 100 && Math.random() < 0.75) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 200 + Math.random() * 150;
                    const spawnX = screenX + Math.cos(angle) * r;
                    const spawnY = screenY + Math.sin(angle) * r;
                    
                    // Directed velocity vectors
                    const vx = (screenX - spawnX) * 0.08;
                    const vy = (screenY - spawnY) * 0.08;
                    
                    this.spawnParticle(spawnX, spawnY, vx, vy, 'red', 3 + Math.random()*2, 25, 0, 0.98);
                }

                // If fully charged, crackle red electrical arcs in fist
                if (charge.value >= 100) {
                    if (Math.random() < 0.2) audioManager.playLightningCrackle();
                    if (Math.random() < 0.4) {
                        this.spawnParticle(
                            screenX + (Math.random()-0.5)*30,
                            screenY + (Math.random()-0.5)*30,
                            (Math.random()-0.5)*12, (Math.random()-0.5)*12,
                            'red', 4, 15, 0, 0.9
                        );
                    }
                }
            } else {
                // Decay charge if fist opened
                this.fistCharges[hand].value = Math.max(0, this.fistCharges[hand].value - 2.5);
            }
        };

        this.timeLoopActive = false; // Reset to check peace signs
        processSpell('Left');
        processSpell('Right');

        // Apply Time Loop Visual Hue Filter to Mirrored Video Elements dynamically
        const webCamCanvas = document.getElementById('output-canvas');
        if (this.timeLoopActive) {
            webCamCanvas.classList.add('timeloop-filter');
        } else {
            webCamCanvas.classList.remove('timeloop-filter');
        }

        // 🌀 SPELL 6: Dual Open Palms (Sling Ring Portal)
        if (landmarks.Left && landmarks.Right && gestures.Left.type === 'Open' && gestures.Right.type === 'Open') {
            const dist = Math.abs(gestures.Left.palmCenter.x - gestures.Right.palmCenter.x);
            
            // Only open 3D portal if hands are spaced horizontally apart
            if (dist > 0.22) {
                portalActive = true;
                activeLeftSpell = 'Sling Portal';
                activeRightSpell = 'Sling Portal';
                this.portalGroup.visible = true;

                // Animate 3D Particle Orbit Physics
                const posAttr = this.portalGeometry.attributes.position;
                for (let i = 0; i < this.portalParticleCount; i++) {
                    this.portalLifetimes[i] -= dt;
                    if (this.portalLifetimes[i] <= 0) {
                        this.resetPortalParticle(i);
                    } else {
                        // Slowly apply simulated downward pull
                        this.portalVelocities[i*3+1] -= 9.8 * dt * 0.28;
                        
                        this.portalPositions[i*3] += this.portalVelocities[i*3] * dt;
                        this.portalPositions[i*3+1] += this.portalVelocities[i*3+1] * dt;
                        this.portalPositions[i*3+2] += this.portalVelocities[i*3+2] * dt;
                    }
                }
                posAttr.needsUpdate = true;

                // Rotate portal torus rings
                this.portalRing.rotation.z -= this.timeLoopActive ? 0.005 : 0.025;

                // Project center between hands to WebGL coordinates
                const midX = ( (1 - gestures.Left.palmCenter.x) + (1 - gestures.Right.palmCenter.x) ) / 2 * this.width;
                const midY = (gestures.Left.palmCenter.y + gestures.Right.palmCenter.y) / 2 * this.height;
                const portalPos = this.get3DPosition(midX, midY, 0.85);

                this.portalGroup.position.copy(portalPos);

                // Scale proportional to horizontal hand separation
                portalScale = Math.max(0.1, dist * 5.0);
                this.portalGroup.scale.set(portalScale, portalScale, portalScale);
            }
        }

        // Render WebGL Portal Scene
        this.renderer.render(this.scene, this.camera);

        // 4. Update Particle Physics Pool
        this.updateAndDrawParticles(dt);

        return {
            portalActive,
            portalScale,
            leftSpell: activeLeftSpell,
            rightSpell: activeRightSpell,
            timeLoop: this.timeLoopActive
        };
    }

    // Concentric 3D Tilted Perspective Mandalas
    draw3DShield(x, y, yaw, pitch, roll, rot) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        
        // Apply 3D matrix scaling rotation through trigonometric transforms
        ctx.rotate(roll + rot);
        ctx.scale(Math.max(0.25, Math.cos(yaw)), Math.max(0.25, Math.cos(pitch)));

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255, 120, 0, 0.9)';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ff5500';

        // Outer Runic Borders
        ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 125, 0, Math.PI * 2); ctx.stroke();
        
        // Draw geometric radial spokes
        for (let i = 0; i < 16; i++) {
            ctx.rotate(Math.PI * 2 / 16);
            ctx.beginPath();
            ctx.moveTo(110, 0);
            ctx.lineTo(125, 10);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(45, 15);
            ctx.lineTo(45, -15);
            ctx.closePath();
            ctx.stroke();
        }

        // Concentric internal structures
        ctx.rotate(-rot * 1.8);
        ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke();

        ctx.beginPath(); ctx.rect(-50, -50, 100, 100); ctx.stroke();
        ctx.rotate(Math.PI / 4);
        ctx.beginPath(); ctx.rect(-50, -50, 100, 100); ctx.stroke();

        ctx.restore();

        // 4. Draw Atmospheric Volumetric Light Shafts
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(x, y, 10, x, y, 160);
        grad.addColorStop(0, 'rgba(255, 110, 0, 0.35)');
        grad.addColorStop(0.3, 'rgba(255, 60, 0, 0.12)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 160, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // Intricate electric branching lightning
    drawLightningBolt(x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#22d3ee';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';

        ctx.beginPath();
        ctx.moveTo(x, y);
        let currX = x;
        let currY = y;
        
        const segments = 16;
        for (let i = 0; i < segments; i++) {
            currX += (Math.random() - 0.5) * 85;
            currY -= (this.height * 0.85) / segments; // Bolts strike upwards
            ctx.lineTo(currX, currY);
        }
        ctx.stroke();

        // White-hot core overlay
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
    }

    // Golden Energy strands (Tao Whip) connecting index & thumb
    drawTaoWhip(tx, ty, ix, iy) {
        const ctx = this.ctx;
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f59e0b';

        // Connect with Bezier wave curve
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        
        // High frequency energy wave oscillation
        const midX = (tx + ix) / 2;
        const midY = (ty + iy) / 2;
        const wave = Math.sin(Date.now() * 0.05) * 15;

        ctx.quadraticCurveTo(midX + wave, midY - wave, ix, iy);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    // Green Runic Chronological Mandala (Eye of Agamotto)
    drawEyeOfAgamotto(x, y, rot) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.95)';
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#10b981';

        // Concentric time gears
        ctx.beginPath(); ctx.arc(0, 0, 95, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 115, 0, Math.PI * 2); ctx.stroke();
        
        // Runic hour subdivisions
        for (let i = 0; i < 12; i++) {
            ctx.rotate(Math.PI * 2 / 12);
            ctx.beginPath();
            ctx.moveTo(95, 0);
            ctx.lineTo(115, 0);
            ctx.stroke();
        }

        // Inner eye structure (Agamotto shape)
        ctx.rotate(-rot * 2);
        ctx.beginPath();
        ctx.moveTo(-60, 0);
        ctx.quadraticCurveTo(0, -45, 60, 0);
        ctx.quadraticCurveTo(0, 45, -60, 0);
        ctx.closePath();
        ctx.stroke();

        // Glowing center core
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();

        ctx.restore();

        // Volumetric green glow aura
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(x, y, 5, x, y, 140);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
        grad.addColorStop(0.4, 'rgba(16, 185, 129, 0.12)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 140, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // Volumetric energy charging indicators
    drawFistCharge(x, y, charge) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.shadowBlur = 10 + (charge * 0.2);
        ctx.shadowColor = '#ef4444';
        ctx.lineWidth = 3;

        // Draw progress arc ring
        ctx.beginPath();
        ctx.arc(0, 0, 75, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * (charge / 100)));
        ctx.stroke();

        // Charging core sphere
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 10 + (charge * 0.45));
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, 'rgba(239, 68, 68, 0.7)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 15 + (charge * 0.45), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Spark physics iteration loop
    updateAndDrawParticles(dt) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Additive glowing blend

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            // Decay lifetime
            p.life -= dt * 60; // scale lifetime
            if (p.life <= 0) {
                p.active = false;
                this.activeParticleCount--;
                continue;
            }

            // Apply gravity and drag
            p.vy += p.gravity * dt * 60;
            p.vx *= p.drag;
            p.vy *= p.drag;

            // Update particle coordinates
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;

            // Color gradient interpolator
            const pct = p.life / p.maxLife;
            let fillStyle = '';
            
            if (p.color === 'orange') {
                fillStyle = `rgba(255, ${Math.floor(80 + pct*175)}, ${Math.floor(pct*50)}, ${pct})`;
            } else if (p.color === 'cyan') {
                fillStyle = `rgba(${Math.floor(pct*120)}, ${Math.floor(180 + pct*75)}, 255, ${pct})`;
            } else if (p.color === 'green') {
                fillStyle = `rgba(${Math.floor(pct*80)}, 255, ${Math.floor(80 + pct*120)}, ${pct})`;
            } else if (p.color === 'amber') {
                fillStyle = `rgba(245, ${Math.floor(100 + pct*145)}, 11, ${pct})`;
            } else if (p.color === 'red') {
                fillStyle = `rgba(255, ${Math.floor(pct*80)}, ${Math.floor(pct*80)}, ${pct})`;
            }

            ctx.fillStyle = fillStyle;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * pct, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}


// ==========================================
// 5. SANCTUM APP INITIALIZER (Main Controller)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab HTML overlay structures
    const startBtn = document.getElementById('start-btn');
    const loadingText = document.getElementById('loading-text');
    const loadingScreen = document.getElementById('loading-screen');
    const uiContainer = document.getElementById('ui-container');
    const centerReticle = document.getElementById('center-reticle');
    
    const videoElement = document.getElementById('input-video');
    const outputCanvas = document.getElementById('output-canvas');
    const vfxCanvas = document.getElementById('vfx-canvas');
    const threeContainer = document.getElementById('three-container');

    // 2. Instantiate Hand Filtering & Landmark Smoothing
    const smoother = new LandmarkSmoother();
    const tracker = new HandTracker(videoElement, outputCanvas, smoother);
    const vfx = new VFXManager(threeContainer, vfxCanvas);

    // Dynamic Cooldown timers
    let clapCooldown = 0;

    // 3. MediaPipe Setup & Loading Callback
    tracker.start().then(() => {
        loadingText.innerHTML = "Webcam aligned. Gateways operational.";
        startBtn.classList.remove('hidden');
    }).catch(err => {
        loadingText.innerHTML = "Access Denied. Ensure webcam is plugged in and allowed.";
        loadingText.style.color = '#ef4444';
        console.error("Camera initial failure:", err);
    });

    // Enter Sanctum button trigger
    startBtn.addEventListener('click', () => {
        // Initialize Synthesizer and ambient drone on click
        audioManager.resume();

        // Fade transitions
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            uiContainer.classList.remove('hidden');
        }, 1200);

        requestAnimationFrame(fpsCounterLoop);
    });

    // 4. Primary MediaPipe Hands Processing Loop callback
    tracker.onFrameCallback = (landmarks, gestures) => {
        // Track overall hand tracking visibility status in HUD
        const trackingStatus = document.getElementById('tracking-status');
        if (landmarks.Left || landmarks.Right) {
            trackingStatus.innerHTML = "TRACKING: ON";
            trackingStatus.className = "hud-metric active";
            centerReticle.style.opacity = '0.15';
        } else {
            trackingStatus.innerHTML = "TRACKING: OFF";
            trackingStatus.className = "hud-metric inactive";
            centerReticle.style.opacity = '0.7';
        }

        // Synthesize screen shake on claps (Sanctum Shockwave)
        if (landmarks.Left && landmarks.Right && clapCooldown <= 0) {
            const pL = gestures.Left.palmCenter;
            const pR = gestures.Right.palmCenter;
            
            // 3D vector distance threshold
            const dist3D = Math.sqrt(
                Math.pow(pL.x - pR.x, 2) +
                Math.pow(pL.y - pR.y, 2) +
                Math.pow(pL.z - pR.z, 2)
            );

            if (dist3D < 0.08 && gestures.Left.type !== 'Fist' && gestures.Right.type !== 'Fist') {
                audioManager.playShockwaveExplosion();
                clapCooldown = 90; // prevent rapid spamming

                // Visual shockwave explosion flash
                const blast = document.createElement('div');
                blast.style.position = 'fixed';
                blast.style.top = '0'; blast.style.left = '0';
                blast.style.width = '100vw'; blast.style.height = '100vh';
                blast.style.background = 'radial-gradient(circle, rgba(255,230,0,1) 0%, rgba(255,40,0,0.85) 60%, rgba(0,0,0,0) 100%)';
                blast.style.zIndex = '999';
                blast.style.pointerEvents = 'none';
                blast.style.transition = 'opacity 0.9s ease-out, transform 0.9s ease-out';
                blast.style.transform = 'scale(0.2)';
                document.body.appendChild(blast);

                document.body.classList.add('shake');

                // Trigger 2D explosion shockwave sparks
                const midX = ( (1 - gestures.Left.palmCenter.x) + (1 - gestures.Right.palmCenter.x) ) / 2 * window.innerWidth;
                const midY = (gestures.Left.palmCenter.y + gestures.Right.palmCenter.y) / 2 * window.innerHeight;
                for (let i = 0; i < 90; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 5 + Math.random() * 25;
                    vfx.spawnParticle(
                        midX, midY,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        Math.random() < 0.55 ? 'orange' : 'red',
                        3.5 + Math.random()*3, 60 + Math.random()*50, 0.05
                    );
                }

                setTimeout(() => {
                    blast.style.opacity = '0';
                    blast.style.transform = 'scale(2.2)';
                    setTimeout(() => {
                        blast.remove();
                        document.body.classList.remove('shake');
                    }, 900);
                }, 50);
            }
        }

        if (clapCooldown > 0) {
            clapCooldown--;
            document.getElementById('badge-shockwave').innerHTML = `CD (${Math.ceil(clapCooldown/60)}s)`;
            document.getElementById('badge-shockwave').className = "spell-status-badge cooldown-badge";
        } else {
            document.getElementById('badge-shockwave').innerHTML = "Ready";
            document.getElementById('badge-shockwave').className = "spell-status-badge inactive";
        }

        // Iterate updates over active/inactive spells in HUD Panels
        const vfxState = vfx.updateAndRender(landmarks, gestures);

        // Update continuous ambient audio synthetics
        const leftSpeed = gestures.Left ? gestures.Left.velocity : 0;
        const rightSpeed = gestures.Right ? gestures.Right.velocity : 0;
        audioManager.updateSanctumHum(leftSpeed + rightSpeed);

        if (vfxState.portalActive) {
            audioManager.startPortalSound();
            audioManager.updatePortalSound(vfxState.portalScale);
        } else {
            audioManager.stopPortalSound();
        }

        // Update Spell Status Badge Highlights in HUD
        updateHUDSpells(vfxState);
    };

    function updateHUDSpells(state) {
        const left = state.leftSpell;
        const right = state.rightSpell;

        const leftHandStatus = document.getElementById('left-hand-status');
        const rightHandStatus = document.getElementById('right-hand-status');

        leftHandStatus.innerHTML = left === 'None' ? 'None' : left.toUpperCase();
        rightHandStatus.innerHTML = right === 'None' ? 'None' : right.toUpperCase();

        const spells = {
            'Shield': { item: 'spell-shield', badge: 'badge-shield' },
            'Lightning': { item: 'spell-lightning', badge: 'badge-lightning' },
            'Tao Whip': { item: 'spell-whip', badge: 'badge-whip' },
            'Time Loop': { item: 'spell-timeloop', badge: 'badge-timeloop' },
            'Power Charge': { item: 'spell-fistcharge', badge: 'badge-fistcharge' },
            'Sling Portal': { item: 'spell-portal', badge: 'badge-portal' }
        };

        // Reset all classes
        for (const [key, ref] of Object.entries(spells)) {
            const itemEl = document.getElementById(ref.item);
            const badgeEl = document.getElementById(ref.badge);
            itemEl.className = "spell-item";
            
            // Don't overwrite clap cooldown text
            if (badgeEl) {
                badgeEl.innerHTML = "Ready";
                badgeEl.className = "spell-status-badge inactive";
            }
        }

        const applyActiveSpellStyle = (spellName) => {
            const ref = spells[spellName];
            if (!ref) return;
            const itemEl = document.getElementById(ref.item);
            const badgeEl = document.getElementById(ref.badge);
            
            let classColor = 'active';
            if (spellName === 'Lightning') classColor = 'active-lightning';
            else if (spellName === 'Tao Whip') classColor = 'active-whip';
            else if (spellName === 'Time Loop') classColor = 'active-timeloop';
            else if (spellName === 'Power Charge') classColor = 'active-fistcharge';
            else if (spellName === 'Sling Portal') classColor = 'active-portal';

            itemEl.className = `spell-item ${classColor}`;
            if (badgeEl) {
                badgeEl.innerHTML = "Active";
                badgeEl.className = "spell-status-badge active-badge";
            }
        };

        if (left !== 'None') applyActiveSpellStyle(left);
        if (right !== 'None') applyActiveSpellStyle(right);
        
        // Reticle alignment live feedback
        const liveFeedback = document.getElementById('live-feedback');
        if (left !== 'None' || right !== 'None') {
            const spell = left !== 'None' ? left : right;
            liveFeedback.innerHTML = `Spells active: ${spell.toUpperCase()}`;
            liveFeedback.style.color = '#ff8c00';
            liveFeedback.style.textShadow = '0 0 10px rgba(255,140,0,0.7)';
        } else {
            liveFeedback.innerHTML = "SPELLCASTING TRAINING ACTIVE. ALIGN HANDS.";
            liveFeedback.style.color = '#94a3b8';
            liveFeedback.style.textShadow = 'none';
        }
    }

    // 5. Connect UI Sidebar Controllers
    // Master volume slider
    const volumeSlider = document.getElementById('volume-control');
    const volumeDisplay = document.getElementById('volume-display');
    volumeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        volumeDisplay.innerHTML = `${val}%`;
        audioManager.setVolume(val / 100);
    });

    // Sensitivity Landmark smoothing slider
    const sensitivitySlider = document.getElementById('sensitivity-control');
    const sensitivityDisplay = document.getElementById('sensitivity-display');
    sensitivitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        smoother.setSmoothing(val);
        
        if (val < 25) sensitivityDisplay.innerHTML = "Low";
        else if (val < 75) sensitivityDisplay.innerHTML = "Optimal";
        else sensitivityDisplay.innerHTML = "High";
    });
    // Set initial smoother values matching HTML sliders
    smoother.setSmoothing(sensitivitySlider.value);

    // Particle cap limits dropdown
    const particleDropdown = document.getElementById('particles-limit');
    particleDropdown.addEventListener('change', (e) => {
        vfx.setParticlesLimit(e.target.value);
    });

    // Show/Hide Webcam layout toggle
    const toggleWebcamBtn = document.getElementById('toggle-webcam');
    toggleWebcamBtn.addEventListener('click', () => {
        const output = document.getElementById('output-canvas');
        if (vfx.showWebcam) {
            vfx.showWebcam = false;
            output.style.opacity = '0';
            toggleWebcamBtn.innerHTML = "Show Webcam";
            toggleWebcamBtn.classList.remove('active');
        } else {
            vfx.showWebcam = true;
            output.style.opacity = '0.65';
            toggleWebcamBtn.innerHTML = "Hide Webcam";
            toggleWebcamBtn.classList.add('active');
        }
    });

    // Landmark skeletal skeleton debugging view toggle
    const toggleLandmarksBtn = document.getElementById('toggle-landmarks');
    toggleLandmarksBtn.addEventListener('click', () => {
        if (tracker.showLandmarks) {
            tracker.setDebugView(false);
            toggleLandmarksBtn.innerHTML = "Show Landmarks";
            toggleLandmarksBtn.classList.remove('active');
        } else {
            tracker.setDebugView(true);
            toggleLandmarksBtn.innerHTML = "Hide Landmarks";
            toggleLandmarksBtn.classList.add('active');
        }
    });

    // Fullscreen support
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                fullscreenBtn.innerHTML = "Exit Fullscreen";
            }).catch(err => {
                console.error("Fullscreen error:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                fullscreenBtn.innerHTML = "Fullscreen";
            });
        }
    });

    // Simple FPS monitoring overlay loop
    let lastTime = 0;
    let frames = 0;
    const fpsCounter = document.getElementById('fps-counter');
    
    function fpsCounterLoop(time) {
        frames++;
        if (time - lastTime >= 1000) {
            fpsCounter.innerHTML = `FPS: ${frames}`;
            frames = 0;
            lastTime = time;
        }
        requestAnimationFrame(fpsCounterLoop);
    }
});
