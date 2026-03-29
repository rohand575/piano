/* ============================================================
   KeyMuse Piano - Application Logic
   Tone.js PolySynth, keyboard/mouse/touch input,
   recording/playback, octave/volume controls,
   instrument presets, effects, sustain, visualizer
   ============================================================ */

// --- Particle Background ---

const PARTICLE_COUNT = 80;
const NOTE_COLORS = {
    'C': '#6366f1', 'C#': '#818cf8', 'D': '#a78bfa', 'D#': '#c084fc',
    'E': '#e879f9', 'F': '#f472b6', 'F#': '#fb7185', 'G': '#22c55e',
    'G#': '#34d399', 'A': '#2dd4bf', 'A#': '#38bdf8', 'B': '#60a5fa'
};
const DEFAULT_PARTICLE_COLOR = 'rgba(99, 102, 241, 0.4)';

let particles = [];
let particleCanvas = null;
let particleCtx = null;
let particleAnimId = null;

function initParticles() {
    particleCanvas = document.getElementById('particle-bg');
    if (!particleCanvas) return;
    particleCtx = particleCanvas.getContext('2d');

    function resize() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
    }

    drawParticles();
}

function createParticle(burst) {
    const w = particleCanvas.width;
    const h = particleCanvas.height;
    return {
        x: burst ? burst.x : Math.random() * w,
        y: burst ? burst.y : Math.random() * h,
        r: Math.random() * 2.5 + 1,
        baseR: 0,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.15,
        color: DEFAULT_PARTICLE_COLOR,
        targetColor: null,
        alpha: Math.random() * 0.5 + 0.2,
        baseAlpha: 0,
        pulse: 0,
        scatter: 0,
        scatterVx: 0,
        scatterVy: 0
    };
}

function drawParticles() {
    particleAnimId = requestAnimationFrame(drawParticles);
    const ctx = particleCtx;
    const w = particleCanvas.width;
    const h = particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
        // Apply scatter velocity (decays over time)
        if (p.scatter > 0) {
            p.x += p.scatterVx * p.scatter;
            p.y += p.scatterVy * p.scatter;
            p.scatter *= 0.95;
            if (p.scatter < 0.01) p.scatter = 0;
        }

        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Pulse decay
        if (p.pulse > 0) {
            p.pulse *= 0.93;
            if (p.pulse < 0.01) p.pulse = 0;
        }

        // Color fade back to default
        if (!p.targetColor && p.pulse <= 0) {
            p.color = DEFAULT_PARTICLE_COLOR;
        }

        const currentR = p.r + p.pulse * 3;
        const currentAlpha = Math.min(1, p.alpha + p.pulse * 0.6);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();

        // Glow on pulse
        if (p.pulse > 0.05) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, currentR + p.pulse * 6, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.pulse * 0.3;
            ctx.fill();
        }
    }

    ctx.globalAlpha = 1;
}

function reactParticlesToNote(note) {
    const noteName = note.replace(/\d+/g, '');
    const color = NOTE_COLORS[noteName] || '#6366f1';

    // Pick random particles to react
    const reactCount = Math.floor(particles.length * 0.35);
    const shuffled = [...particles].sort(() => Math.random() - 0.5);

    for (let i = 0; i < reactCount; i++) {
        const p = shuffled[i];
        p.pulse = 1;
        p.color = color;
        p.targetColor = color;

        // Scatter away from center
        const cx = particleCanvas.width / 2;
        const cy = particleCanvas.height / 2;
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.scatter = 1;
        p.scatterVx = (dx / dist) * (Math.random() * 2 + 1);
        p.scatterVy = (dy / dist) * (Math.random() * 2 + 1);

        // Schedule color fade-back
        setTimeout(() => { p.targetColor = null; }, 600 + Math.random() * 400);
    }
}

// --- Constants & Configuration ---

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const KEY_MAP = {
    'a': 'C',  'w': 'C#', 's': 'D',  'e': 'D#',
    'd': 'E',  'f': 'F',  't': 'F#', 'g': 'G',
    'y': 'G#', 'h': 'A',  'u': 'A#', 'j': 'B',
    'k': 'C+'
};

const MIN_OCTAVE = 1;
const MAX_OCTAVE = 7;
const DEFAULT_OCTAVE = 4;
const DEFAULT_VOLUME = 75;

const BLACK_KEY_OFFSETS = [
    { note: 'C#', whiteIndex: 0 },
    { note: 'D#', whiteIndex: 1 },
    { note: 'F#', whiteIndex: 3 },
    { note: 'G#', whiteIndex: 4 },
    { note: 'A#', whiteIndex: 5 }
];

// --- Instrument Presets ---

const PRESETS = {
    piano: {
        label: 'Piano',
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.015, decay: 1.5, sustain: 0.08, release: 1.0 }
    },
    electric: {
        label: 'Electric',
        oscillator: { type: 'fmsine', modulationIndex: 3, modulationType: 'sine' },
        envelope: { attack: 0.01, decay: 0.8, sustain: 0.2, release: 0.6 }
    },
    organ: {
        label: 'Organ',
        oscillator: { type: 'sawtooth4' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.8, release: 0.3 }
    },
    synth: {
        label: 'Synth',
        oscillator: { type: 'square8' },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.4 }
    },
    warm: {
        label: 'Warm',
        oscillator: { type: 'sine' },
        envelope: { attack: 0.1, decay: 1.0, sustain: 0.4, release: 1.2 }
    },
    bell: {
        label: 'Bell',
        oscillator: { type: 'amsine', modulationIndex: 5, modulationType: 'sine' },
        envelope: { attack: 0.005, decay: 2.0, sustain: 0.01, release: 1.5 }
    }
};

// --- State ---

let baseOctave = DEFAULT_OCTAVE;
let currentVolume = DEFAULT_VOLUME;
let currentPreset = 'piano';
let isRecording = false;
let recordingData = [];
let recordingStartTime = 0;
let isPlaying = false;
let playbackTimeouts = [];
let activeKeys = new Set();
let activeNotes = new Map();
let audioStarted = false;
let volumeNode = null;
let reverbNode = null;
let delayNode = null;
let analyserNode = null;
let fftNode = null;
let reverbActive = false;
let delayActive = false;
let sustainActive = false;
let sustainedNotes = new Set();
let voices = new Map();  // note -> { synth, disposeTimer }
let animFrameId = null;

// --- DOM References ---

const elements = {};

function cacheElements() {
    elements.overlay = document.getElementById('audio-overlay');
    elements.piano = document.getElementById('piano');
    elements.noteDisplay = document.getElementById('current-note');
    elements.volumeSlider = document.getElementById('volume-slider');
    elements.volumeValue = document.getElementById('volume-value');
    elements.octaveDisplay = document.getElementById('octave-display');
    elements.octaveDown = document.getElementById('octave-down');
    elements.octaveUp = document.getElementById('octave-up');
    elements.recordBtn = document.getElementById('record-btn');
    elements.playBtn = document.getElementById('play-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.recordingIndicator = document.getElementById('recording-indicator');
    elements.howToPlayToggle = document.getElementById('how-to-play-toggle');
    elements.howToPlayContent = document.getElementById('how-to-play-content');
    elements.instrumentSelect = document.getElementById('instrument-select');
    elements.reverbBtn = document.getElementById('reverb-btn');
    elements.delayBtn = document.getElementById('delay-btn');
    elements.sustainIndicator = document.getElementById('sustain-indicator');
    elements.visualizer = document.getElementById('visualizer');
    elements.spectrum = document.getElementById('spectrum');
}

// --- Audio Engine ---

function disposeVoice(note) {
    const voice = voices.get(note);
    if (!voice) return;
    clearTimeout(voice.disposeTimer);
    try { voice.synth.disconnect(); } catch (_) {}
    voice.synth.dispose();
    voices.delete(note);
}

function disposeAllVoices() {
    for (const note of voices.keys()) {
        disposeVoice(note);
    }
}

function buildAudioGraph() {
    // Dispose old nodes
    disposeAllVoices();
    if (volumeNode) { volumeNode.disconnect(); volumeNode.dispose(); }
    if (reverbNode) { reverbNode.disconnect(); reverbNode.dispose(); }
    if (delayNode) { delayNode.disconnect(); delayNode.dispose(); }
    if (analyserNode) { analyserNode.disconnect(); analyserNode.dispose(); }
    if (fftNode) { fftNode.disconnect(); fftNode.dispose(); }

    // Shared volume node — all per-note synths connect here
    volumeNode = new Tone.Volume(0);

    // Create effects
    reverbNode = new Tone.Reverb({ decay: 2.5, wet: reverbActive ? 0.4 : 0 });
    delayNode = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: delayActive ? 0.35 : 0 });
    analyserNode = new Tone.Analyser('waveform', 256);
    fftNode = new Tone.Analyser('fft', 128);

    // Chain: volumeNode -> reverb -> delay -> analyser -> destination
    volumeNode.chain(reverbNode, delayNode, analyserNode, Tone.getDestination());
    // Also connect to FFT analyser (parallel tap)
    analyserNode.connect(fftNode);

    updateVolume(currentVolume);
}

function initAudio() {
    buildAudioGraph();
    startVisualizer();
}

function switchInstrument(presetKey) {
    if (!PRESETS[presetKey]) return;
    currentPreset = presetKey;
    disposeAllVoices();
}

function playNote(note) {
    if (!volumeNode) return;

    // Resume audio context if browser suspended it during inactivity
    if (Tone.context.state !== 'running') {
        Tone.context.resume();
    }

    // Kill any existing voice for this note immediately
    disposeVoice(note);
    sustainedNotes.delete(note);

    // Create a fresh Synth for this note
    const preset = PRESETS[currentPreset] || PRESETS.piano;
    const s = new Tone.Synth({
        oscillator: preset.oscillator,
        envelope: preset.envelope
    });
    s.connect(volumeNode);
    s.triggerAttack(note, Tone.now());

    voices.set(note, { synth: s, disposeTimer: null });
    updateNoteDisplay(note);

    if (isRecording) {
        activeNotes.set(note, performance.now());
    }
}

function stopNote(note) {
    const voice = voices.get(note);
    if (!voice) return;

    voice.synth.triggerRelease(Tone.now());

    // Schedule disposal after the release envelope finishes
    const preset = PRESETS[currentPreset] || PRESETS.piano;
    const releaseMs = (preset.envelope.release || 1) * 1000 + 300;
    voice.disposeTimer = setTimeout(() => disposeVoice(note), releaseMs);

    if (isRecording && activeNotes.has(note)) {
        const startTime = activeNotes.get(note);
        const duration = performance.now() - startTime;
        const relativeStart = startTime - recordingStartTime;
        recordingData.push({ note, time: relativeStart, duration });
        activeNotes.delete(note);
    }
}

function updateVolume(percent) {
    if (!volumeNode) return;
    currentVolume = percent;
    if (percent === 0) {
        volumeNode.volume.value = -Infinity;
    } else {
        volumeNode.volume.value = -40 + (percent / 100) * 40;
    }
}

// --- Effects Control ---

function toggleReverb() {
    reverbActive = !reverbActive;
    if (reverbNode) {
        reverbNode.wet.rampTo(reverbActive ? 0.4 : 0, 0.3);
    }
    elements.reverbBtn.classList.toggle('effect-active', reverbActive);
}

function toggleDelay() {
    delayActive = !delayActive;
    if (delayNode) {
        delayNode.wet.rampTo(delayActive ? 0.35 : 0, 0.3);
    }
    elements.delayBtn.classList.toggle('effect-active', delayActive);
}

// --- Sustain Pedal ---

function releaseSustainedNotes() {
    for (const note of sustainedNotes) {
        pianoRollNoteOff(note);
        stopNote(note);
        highlightKey(note, false);
    }
    sustainedNotes.clear();
}

// --- Waveform Visualizer ---

function startVisualizer() {
    const canvas = elements.visualizer;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Spectrum canvas
    const specCanvas = elements.spectrum;
    const specCtx = specCanvas ? specCanvas.getContext('2d') : null;

    // Smoothed bar heights for bouncy animation
    const smoothBars = new Float32Array(128);

    function resizeCanvas() {
        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (specCanvas) {
            const specRect = specCanvas.getBoundingClientRect();
            specCanvas.width = specRect.width * dpr;
            specCanvas.height = specRect.height * dpr;
            specCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function draw() {
        animFrameId = requestAnimationFrame(draw);
        if (!analyserNode) return;

        const width = canvas.getBoundingClientRect().width;
        const height = canvas.getBoundingClientRect().height;
        const data = analyserNode.getValue();

        ctx.clearRect(0, 0, width, height);

        // Glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#6366f1';
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / data.length;
        let x = 0;
        let hasSignal = false;

        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            if (Math.abs(v) > 0.005) hasSignal = true;
            const y = ((v + 1) / 2) * height;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        if (hasSignal) {
            ctx.strokeStyle = '#a78bfa';
            ctx.shadowColor = '#7c3aed';
            ctx.shadowBlur = 12;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        // --- Frequency Spectrum Bars ---
        if (!specCtx || !fftNode) return;

        const specWidth = specCanvas.getBoundingClientRect().width;
        const specHeight = specCanvas.getBoundingClientRect().height;
        const fftData = fftNode.getValue(); // dB values

        specCtx.clearRect(0, 0, specWidth, specHeight);

        // Use only the lower ~60% of bins (skip ultra-high frequencies)
        const usableBins = Math.floor(fftData.length * 0.6);
        const barCount = Math.min(usableBins, 64);
        const gap = 2;
        const barWidth = (specWidth - gap * (barCount - 1)) / barCount;

        for (let i = 0; i < barCount; i++) {
            // Map bar index to FFT bin
            const binIndex = Math.floor((i / barCount) * usableBins);
            const db = fftData[binIndex];

            // Normalize dB: FFT returns roughly -100 to 0
            const normalized = Math.max(0, (db + 100) / 100);
            const targetHeight = normalized * specHeight;

            // Smooth: rise fast, fall slow (bouncy decay)
            if (targetHeight > smoothBars[i]) {
                smoothBars[i] = targetHeight; // snap up
            } else {
                smoothBars[i] += (targetHeight - smoothBars[i]) * 0.15; // ease down
            }

            const barH = smoothBars[i];
            const bx = i * (barWidth + gap);
            const by = specHeight - barH;

            // Color gradient per bar (hue shifts across spectrum)
            const hue = (i / barCount) * 270 + 240; // blue -> purple -> pink
            const lightness = 55 + normalized * 20;
            specCtx.fillStyle = `hsl(${hue % 360}, 80%, ${lightness}%)`;

            // Glow when loud
            if (normalized > 0.4) {
                specCtx.shadowBlur = 8 + normalized * 8;
                specCtx.shadowColor = `hsl(${hue % 360}, 90%, 60%)`;
            } else {
                specCtx.shadowBlur = 0;
            }

            // Rounded top bars
            const radius = Math.min(barWidth / 2, 3);
            specCtx.beginPath();
            specCtx.moveTo(bx + radius, by);
            specCtx.lineTo(bx + barWidth - radius, by);
            specCtx.quadraticCurveTo(bx + barWidth, by, bx + barWidth, by + radius);
            specCtx.lineTo(bx + barWidth, specHeight);
            specCtx.lineTo(bx, specHeight);
            specCtx.lineTo(bx, by + radius);
            specCtx.quadraticCurveTo(bx, by, bx + radius, by);
            specCtx.fill();
        }

        specCtx.shadowBlur = 0;
    }

    draw();
}

// --- Piano Roll (Falling Notes) ---

let pianoRollNotes = [];
let pianoRollActiveMap = new Map();
let pianoRollKeyMap = new Map();
let pianoRollCanvas = null;
let pianoRollCtx = null;
let pianoRollW = 0;
let pianoRollH = 0;
const ROLL_SPEED = 0.08;
const ROLL_MIN_HEIGHT = 8;

function initPianoRoll() {
    pianoRollCanvas = document.getElementById('piano-roll');
    if (!pianoRollCanvas) return;
    pianoRollCtx = pianoRollCanvas.getContext('2d');
    syncPianoRollSize();
    cachePianoRollKeys();
    window.addEventListener('resize', () => {
        syncPianoRollSize();
        cachePianoRollKeys();
    });
    renderPianoRoll();
}

function syncPianoRollSize() {
    if (!pianoRollCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const container = pianoRollCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    pianoRollW = rect.width;
    pianoRollH = rect.height;
    pianoRollCanvas.width = pianoRollW * dpr;
    pianoRollCanvas.height = pianoRollH * dpr;
    pianoRollCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cachePianoRollKeys() {
    pianoRollKeyMap.clear();
    if (!elements.piano) return;
    const pianoRect = elements.piano.getBoundingClientRect();
    elements.piano.querySelectorAll('.key').forEach(key => {
        const note = key.dataset.note;
        const kr = key.getBoundingClientRect();
        pianoRollKeyMap.set(note, {
            x: kr.left - pianoRect.left,
            width: kr.width,
            isBlack: key.classList.contains('black')
        });
    });
}

function getPianoKeyPos(note) {
    return pianoRollKeyMap.get(note) || null;
}

function pianoRollNoteOn(note) {
    if (!pianoRollCanvas) return;
    pianoRollNoteOff(note);
    const pos = getPianoKeyPos(note);
    if (!pos) return;
    const noteName = note.replace(/\d+/g, '');
    const color = NOTE_COLORS[noteName] || '#6366f1';
    const obj = {
        x: pos.x, width: pos.width, isBlack: pos.isBlack,
        color, startTime: performance.now(), endTime: null
    };
    pianoRollNotes.push(obj);
    pianoRollActiveMap.set(note, obj);
}

function pianoRollNoteOff(note) {
    const obj = pianoRollActiveMap.get(note);
    if (obj) {
        obj.endTime = performance.now();
        pianoRollActiveMap.delete(note);
    }
}

function clearPianoRollActive() {
    const now = performance.now();
    for (const [, obj] of pianoRollActiveMap) obj.endTime = now;
    pianoRollActiveMap.clear();
}

function renderPianoRoll() {
    requestAnimationFrame(renderPianoRoll);
    if (!pianoRollCtx) return;
    const ctx = pianoRollCtx;
    const w = pianoRollW;
    const h = pianoRollH;
    if (w === 0 || h === 0) return;
    const now = performance.now();

    ctx.clearRect(0, 0, w, h);
    drawPianoRollLanes(ctx, w, h);

    // Cull off-screen notes
    pianoRollNotes = pianoRollNotes.filter(n => {
        if (!n.endTime) return true;
        const elapsed = now - n.endTime;
        return (h - elapsed * ROLL_SPEED) > -200;
    });

    // Draw note blocks
    for (const n of pianoRollNotes) {
        let bottomY, topY;
        if (!n.endTime) {
            bottomY = h;
            topY = h - Math.max((now - n.startTime) * ROLL_SPEED, ROLL_MIN_HEIGHT);
        } else {
            const dur = n.endTime - n.startTime;
            const elapsed = now - n.endTime;
            bottomY = h - elapsed * ROLL_SPEED;
            topY = bottomY - Math.max(dur * ROLL_SPEED, ROLL_MIN_HEIGHT);
        }

        const dTop = Math.max(0, topY);
        const dBottom = Math.min(h, bottomY);
        if (dBottom <= dTop) continue;
        const dH = dBottom - dTop;

        const fadeZone = h * 0.25;
        const alpha = dTop < fadeZone ? Math.max(0.05, dTop / fadeZone) : 1;
        const isActive = !n.endTime;

        ctx.shadowBlur = isActive ? 16 : 8;
        ctx.shadowColor = n.color;

        const inset = n.isBlack ? 1 : 2;
        const nw = n.width - inset * 2;
        const r = Math.min(5, dH / 2, nw / 2);
        ctx.beginPath();
        pianoRollRoundRect(ctx, n.x + inset, dTop, nw, dH, r);

        const grad = ctx.createLinearGradient(n.x, 0, n.x + n.width, 0);
        grad.addColorStop(0, n.color + 'aa');
        grad.addColorStop(0.5, n.color);
        grad.addColorStop(1, n.color + 'aa');
        ctx.fillStyle = grad;
        ctx.globalAlpha = alpha * (isActive ? 0.92 : 0.7);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // "Now" line glow at bottom
    const nowGrad = ctx.createLinearGradient(0, h - 4, 0, h);
    nowGrad.addColorStop(0, 'transparent');
    nowGrad.addColorStop(1, 'rgba(99, 102, 241, 0.6)');
    ctx.fillStyle = nowGrad;
    ctx.fillRect(0, h - 4, w, 4);

    // Top fade overlay
    const topFade = ctx.createLinearGradient(0, 0, 0, 50);
    topFade.addColorStop(0, '#0a0a16');
    topFade.addColorStop(1, 'transparent');
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, w, 50);
}

function drawPianoRollLanes(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (const [, pos] of pianoRollKeyMap) {
        if (!pos.isBlack) {
            const x = Math.round(pos.x + pos.width) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
    }
}

function pianoRollRoundRect(ctx, x, y, w, h, r) {
    if (r <= 0 || w <= 0 || h <= 0) { ctx.rect(x, y, w, h); return; }
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// --- Piano Keyboard Generation ---

function getKeyDimensions() {
    const style = getComputedStyle(document.documentElement);
    return {
        whiteWidth: parseFloat(style.getPropertyValue('--white-key-width')),
        blackWidth: parseFloat(style.getPropertyValue('--black-key-width'))
    };
}

function buildPiano() {
    elements.piano.innerHTML = '';

    const octaves = [baseOctave, baseOctave + 1];
    const dims = getKeyDimensions();

    // Build white keys
    const whiteKeysData = [];
    for (const oct of octaves) {
        for (const note of WHITE_NOTES) {
            whiteKeysData.push({ note: note + oct, name: note, octave: oct });
        }
    }
    // Extra C at the end
    whiteKeysData.push({ note: 'C' + (baseOctave + 2), name: 'C', octave: baseOctave + 2 });

    whiteKeysData.forEach((data) => {
        const keyEl = createKeyElement(data.note, 'white');
        elements.piano.appendChild(keyEl);
    });

    // Build black keys (absolutely positioned)
    for (const oct of octaves) {
        const octaveOffset = (oct - baseOctave) * 7;

        BLACK_KEY_OFFSETS.forEach((offset) => {
            const fullNote = offset.note + oct;
            const left = (octaveOffset + offset.whiteIndex) * dims.whiteWidth
                        + dims.whiteWidth - (dims.blackWidth / 2);

            const keyEl = createKeyElement(fullNote, 'black');
            keyEl.style.left = left + 'px';
            elements.piano.appendChild(keyEl);
        });
    }

    if (pianoRollCanvas) {
        syncPianoRollSize();
        cachePianoRollKeys();
    }
}

function createKeyElement(note, type) {
    const keyEl = document.createElement('div');
    keyEl.className = 'key ' + type;
    keyEl.dataset.note = note;

    const kbKey = findKeyboardKey(note);
    if (kbKey) keyEl.dataset.key = kbKey;

    // Keyboard shortcut label
    const label = document.createElement('span');
    label.className = 'key-label';
    label.textContent = kbKey ? kbKey.toUpperCase() : '';
    keyEl.appendChild(label);

    // Note name label (white keys only)
    if (type === 'white') {
        const noteLabel = document.createElement('span');
        noteLabel.className = 'key-note';
        noteLabel.textContent = note;
        keyEl.appendChild(noteLabel);
    }

    addPointerListeners(keyEl, note);
    return keyEl;
}

function findKeyboardKey(note) {
    for (const [key, mapped] of Object.entries(KEY_MAP)) {
        const target = mapped === 'C+'
            ? 'C' + (baseOctave + 1)
            : mapped + baseOctave;
        if (target === note) return key;
    }
    return null;
}

// --- Pointer Event Handling (Mouse + Touch) ---

function addPointerListeners(keyEl, note) {
    let isPressed = false;

    const press = (e) => {
        e.preventDefault();
        if (isPressed) return;
        isPressed = true;
        ensureAudioStarted().then(() => activateKey(note));
    };

    const release = () => {
        if (!isPressed) return;
        isPressed = false;
        deactivateKey(note);
    };

    keyEl.addEventListener('mousedown', press);
    keyEl.addEventListener('mouseup', release);
    keyEl.addEventListener('mouseleave', release);

    keyEl.addEventListener('touchstart', press, { passive: false });
    keyEl.addEventListener('touchend', release);
    keyEl.addEventListener('touchcancel', release);
}

// --- Key Activation ---

function activateKey(note) {
    playNote(note);
    highlightKey(note, true);
    spawnRipple(note);
    reactParticlesToNote(note);
    pianoRollNoteOn(note);
}

function deactivateKey(note) {
    if (sustainActive) {
        sustainedNotes.add(note);
        const keyEl = elements.piano.querySelector('.key[data-note="' + note + '"]');
        if (keyEl) {
            keyEl.classList.remove('active');
            keyEl.classList.add('sustained');
        }
        return;
    }
    pianoRollNoteOff(note);
    stopNote(note);
    highlightKey(note, false);
}

function highlightKey(note, active) {
    const keyEl = elements.piano.querySelector('.key[data-note="' + note + '"]');
    if (keyEl) {
        keyEl.classList.toggle('active', active);
        if (!active) keyEl.classList.remove('sustained');
    }
}

function updateNoteDisplay(note) {
    elements.noteDisplay.textContent = note;
    elements.noteDisplay.classList.add('pop');
    setTimeout(() => elements.noteDisplay.classList.remove('pop'), 150);
}

// --- Key Press Ripple Effect ---

function spawnRipple(note) {
    const keyEl = elements.piano.querySelector('.key[data-note="' + note + '"]');
    if (!keyEl) return;

    // Remove existing ripple if any
    const existing = keyEl.querySelector('.key-ripple');
    if (existing) existing.remove();

    const ripple = document.createElement('div');
    ripple.className = 'key-ripple';
    if (keyEl.classList.contains('black')) {
        ripple.classList.add('black-ripple');
    }
    keyEl.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

// --- Keyboard Input ---

function handleKeyDown(e) {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const key = e.key.toLowerCase();

    // Sustain pedal (spacebar)
    if (e.key === ' ') {
        e.preventDefault();
        if (!sustainActive) {
            sustainActive = true;
            elements.sustainIndicator.classList.add('active');
        }
        return;
    }

    // Octave shortcuts
    if (key === 'z') {
        e.preventDefault();
        setOctave(baseOctave - 1);
        flashOctaveDisplay();
        return;
    }
    if (key === 'x') {
        e.preventDefault();
        setOctave(baseOctave + 1);
        flashOctaveDisplay();
        return;
    }

    if (!(key in KEY_MAP)) return;
    if (activeKeys.has(key)) return;

    e.preventDefault();
    activeKeys.add(key);
    const note = resolveNote(key);
    activateKey(note);
}

function handleKeyUp(e) {
    // Sustain pedal release
    if (e.key === ' ') {
        sustainActive = false;
        elements.sustainIndicator.classList.remove('active');
        releaseSustainedNotes();
        return;
    }

    const key = e.key.toLowerCase();
    if (!(key in KEY_MAP)) return;

    activeKeys.delete(key);
    const note = resolveNote(key);
    deactivateKey(note);
}

function resolveNote(key) {
    const mapped = KEY_MAP[key];
    if (mapped === 'C+') return 'C' + (baseOctave + 1);
    return mapped + baseOctave;
}

function flashOctaveDisplay() {
    elements.octaveDisplay.classList.add('flash');
    setTimeout(() => elements.octaveDisplay.classList.remove('flash'), 300);
}

// --- Recording & Playback ---

function startRecording() {
    isRecording = true;
    recordingData = [];
    activeNotes.clear();
    recordingStartTime = performance.now();

    elements.recordBtn.classList.add('recording');
    elements.recordingIndicator.classList.remove('hidden');
    elements.playBtn.disabled = true;
    elements.clearBtn.disabled = true;
}

function stopRecording() {
    isRecording = false;

    // Finalize held notes
    for (const [note, startTime] of activeNotes) {
        recordingData.push({
            note,
            time: startTime - recordingStartTime,
            duration: performance.now() - startTime
        });
    }
    activeNotes.clear();

    elements.recordBtn.classList.remove('recording');
    elements.recordingIndicator.classList.add('hidden');

    const hasNotes = recordingData.length > 0;
    elements.playBtn.disabled = !hasNotes;
    elements.clearBtn.disabled = !hasNotes;
}

function toggleRecording() {
    if (isPlaying) return;
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function playRecording() {
    if (recordingData.length === 0 || isPlaying || isRecording) return;

    isPlaying = true;
    elements.playBtn.classList.add('playing');
    elements.playBtn.disabled = true;
    elements.recordBtn.disabled = true;
    elements.clearBtn.disabled = true;

    let maxEndTime = 0;

    recordingData.forEach((entry) => {
        const onTimeout = setTimeout(() => activateKey(entry.note), entry.time);
        playbackTimeouts.push(onTimeout);

        const offTime = entry.time + entry.duration;
        const offTimeout = setTimeout(() => deactivateKey(entry.note), offTime);
        playbackTimeouts.push(offTimeout);

        maxEndTime = Math.max(maxEndTime, offTime);
    });

    const doneTimeout = setTimeout(() => {
        stopPlayback();
    }, maxEndTime + 100);
    playbackTimeouts.push(doneTimeout);
}

function stopPlayback() {
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
    isPlaying = false;

    elements.playBtn.classList.remove('playing');
    elements.playBtn.disabled = false;
    elements.recordBtn.disabled = false;
    elements.clearBtn.disabled = false;
}

function clearRecording() {
    if (isPlaying) stopPlayback();
    recordingData = [];
    activeNotes.clear();
    elements.playBtn.disabled = true;
    elements.clearBtn.disabled = true;
}

// --- Octave Control ---

function setOctave(newOctave) {
    newOctave = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, newOctave));
    if (newOctave === baseOctave) return;

    // Release all active notes before switching
    for (const key of activeKeys) {
        const note = resolveNote(key);
        stopNote(note);
    }
    activeKeys.clear();

    // Release any mouse/touch held notes
    elements.piano.querySelectorAll('.key.active').forEach((keyEl) => {
        const note = keyEl.dataset.note;
        stopNote(note);
        keyEl.classList.remove('active');
    });

    // Release sustained notes
    releaseSustainedNotes();
    disposeAllVoices();
    clearPianoRollActive();

    baseOctave = newOctave;
    elements.octaveDisplay.textContent = baseOctave;
    buildPiano();
}

// --- How to Play Panel ---

function initHowToPlayPanel() {
    elements.howToPlayToggle.addEventListener('click', () => {
        const expanded = elements.howToPlayToggle.getAttribute('aria-expanded') === 'true';
        elements.howToPlayToggle.setAttribute('aria-expanded', !expanded);

        if (expanded) {
            elements.howToPlayContent.classList.add('collapsed');
        } else {
            // Set max-height to actual content height for smooth animation
            elements.howToPlayContent.classList.remove('collapsed');
            elements.howToPlayContent.style.maxHeight = elements.howToPlayContent.scrollHeight + 'px';
        }
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

            // Update max-height after tab switch
            if (elements.howToPlayToggle.getAttribute('aria-expanded') === 'true') {
                setTimeout(() => {
                    elements.howToPlayContent.style.maxHeight = elements.howToPlayContent.scrollHeight + 'px';
                }, 10);
            }
        });
    });
}

// --- Audio Start (browser autoplay policy) ---

async function ensureAudioStarted() {
    if (audioStarted) return;
    audioStarted = true;

    const silentAudio = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
    );
    silentAudio.play().catch(() => {});

    await Tone.start();
    initAudio();
    elements.overlay.classList.add('hidden');
}

// --- Initialization ---

function init() {
    cacheElements();

    // Overlay click
    elements.overlay.addEventListener('click', () => ensureAudioStarted());

    // Keyboard events
    document.addEventListener('keydown', async (e) => {
        if (!audioStarted) {
            const key = e.key.toLowerCase();
            if (key in KEY_MAP || e.key === ' ') {
                await ensureAudioStarted();
            }
        }
        handleKeyDown(e);
    });

    document.addEventListener('keyup', handleKeyUp);

    // Resume AudioContext when returning to the tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && audioStarted) {
            Tone.context.resume();
        }
    });

    // Volume
    elements.volumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        updateVolume(val);
        elements.volumeValue.textContent = val + '%';
    });

    // Octave
    elements.octaveDown.addEventListener('click', () => setOctave(baseOctave - 1));
    elements.octaveUp.addEventListener('click', () => setOctave(baseOctave + 1));

    // Instrument selector
    elements.instrumentSelect.addEventListener('change', (e) => {
        switchInstrument(e.target.value);
    });

    // Effects
    elements.reverbBtn.addEventListener('click', toggleReverb);
    elements.delayBtn.addEventListener('click', toggleDelay);

    // Recording
    elements.recordBtn.addEventListener('click', toggleRecording);
    elements.playBtn.addEventListener('click', playRecording);
    elements.clearBtn.addEventListener('click', clearRecording);

    // How to Play
    initHowToPlayPanel();

    // Build piano
    buildPiano();
    initPianoRoll();

    // Set initial display values
    elements.volumeValue.textContent = currentVolume + '%';
    elements.octaveDisplay.textContent = baseOctave;
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    // initParticles();
});
