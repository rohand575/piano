/* ============================================================
   KeyMuse Piano - Application Logic
   Tone.js PolySynth, keyboard/mouse/touch input,
   recording/playback, octave/volume controls,
   instrument presets, effects, sustain, visualizer
   ============================================================ */

// --- Particle Background ---

const PARTICLE_COUNT = 80;
// Synesthesia palette — each note gets a distinct hue
const NOTE_COLORS = {
    'C': '#3b82f6', 'C#': '#6366f1', 'D': '#22c55e', 'D#': '#14b8a6',
    'E': '#f97316', 'F': '#ec4899', 'F#': '#f43f5e', 'G': '#a855f7',
    'G#': '#8b5cf6', 'A': '#06b6d4', 'A#': '#0ea5e9', 'B': '#eab308'
};

// Full theme data for each note (primary, hover, glow)
const NOTE_THEME = {
    'C':  { primary: '#3b82f6', hover: '#60a5fa', glow: 'rgba(59,130,246,0.4)' },
    'C#': { primary: '#6366f1', hover: '#818cf8', glow: 'rgba(99,102,241,0.4)' },
    'D':  { primary: '#22c55e', hover: '#4ade80', glow: 'rgba(34,197,94,0.4)' },
    'D#': { primary: '#14b8a6', hover: '#2dd4bf', glow: 'rgba(20,184,166,0.4)' },
    'E':  { primary: '#f97316', hover: '#fb923c', glow: 'rgba(249,115,22,0.4)' },
    'F':  { primary: '#ec4899', hover: '#f472b6', glow: 'rgba(236,72,153,0.4)' },
    'F#': { primary: '#f43f5e', hover: '#fb7185', glow: 'rgba(244,63,94,0.4)' },
    'G':  { primary: '#a855f7', hover: '#c084fc', glow: 'rgba(168,85,247,0.4)' },
    'G#': { primary: '#8b5cf6', hover: '#a78bfa', glow: 'rgba(139,92,246,0.4)' },
    'A':  { primary: '#06b6d4', hover: '#22d3ee', glow: 'rgba(6,182,212,0.4)' },
    'A#': { primary: '#0ea5e9', hover: '#38bdf8', glow: 'rgba(14,165,233,0.4)' },
    'B':  { primary: '#eab308', hover: '#facc15', glow: 'rgba(234,179,8,0.4)' },
};

const DEFAULT_PARTICLE_COLOR = 'rgba(99, 102, 241, 0.4)';

// --- Song Library for Learn Mode ---
const SONG_LIBRARY = [
    {
        id: 1,
        title: 'C Major Scale',
        difficulty: 'beginner',
        notes: [
            { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'd', note: 'E' }, { key: 'f', note: 'F' },
            { key: 'g', note: 'G' }, { key: 'h', note: 'A' }, { key: 'j', note: 'B' }, { key: 'k', note: 'C' }
        ]
    },
    {
        id: 2,
        title: 'Mary Had a Little Lamb',
        difficulty: 'beginner',
        notes: [
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' },
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' },
            { key: 's', note: 'D' }, { key: 's', note: 'D' }, { key: 's', note: 'D' },
            { key: 'd', note: 'E' }, { key: 'g', note: 'G' }, { key: 'g', note: 'G' },
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' },
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' },
            { key: 's', note: 'D' }, { key: 's', note: 'D' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }
        ]
    },
    {
        id: 3,
        title: 'Twinkle Twinkle',
        difficulty: 'beginner',
        notes: [
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 'g', note: 'G' }, { key: 'g', note: 'G' },
            { key: 'h', note: 'A' }, { key: 'h', note: 'A' }, { key: 'g', note: 'G' },
            { key: 'f', note: 'F' }, { key: 'f', note: 'F' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' },
            { key: 's', note: 'D' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }
        ]
    },
    {
        id: 4,
        title: 'Hot Cross Buns',
        difficulty: 'beginner',
        notes: [
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' },
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' },
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 's', note: 'D' },
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }
        ]
    },
    {
        id: 5,
        title: 'Ode to Joy',
        difficulty: 'intermediate',
        notes: [
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'f', note: 'F' }, { key: 'g', note: 'G' },
            { key: 'g', note: 'G' }, { key: 'f', note: 'F' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' },
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'd', note: 'E' },
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 's', note: 'D' },
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'f', note: 'F' }, { key: 'g', note: 'G' },
            { key: 'g', note: 'G' }, { key: 'f', note: 'F' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' },
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'd', note: 'E' },
            { key: 's', note: 'D' }, { key: 'a', note: 'C' }, { key: 'a', note: 'C' }
        ]
    },
    {
        id: 6,
        title: 'Happy Birthday',
        difficulty: 'intermediate',
        notes: [
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' },
            { key: 'f', note: 'F' }, { key: 'd', note: 'E' },
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' },
            { key: 'g', note: 'G' }, { key: 'f', note: 'F' },
            { key: 'a', note: 'C' }, { key: 'a', note: 'C' }, { key: 'k', note: 'C' }, { key: 'h', note: 'A' },
            { key: 'f', note: 'F' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' }
        ]
    },
    {
        id: 7,
        title: 'Jingle Bells',
        difficulty: 'beginner',
        notes: [
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' },
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' },
            { key: 'd', note: 'E' }, { key: 'g', note: 'G' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'd', note: 'E' },
            { key: 'f', note: 'F' }, { key: 'f', note: 'F' }, { key: 'f', note: 'F' }, { key: 'f', note: 'F' },
            { key: 'f', note: 'F' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 'd', note: 'E' },
            { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 's', note: 'D' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'g', note: 'G' }
        ]
    },
    {
        id: 8,
        title: 'Für Elise (Opening)',
        difficulty: 'intermediate',
        notes: [
            { key: 'd', note: 'E' }, { key: 'e', note: 'D#' }, { key: 'd', note: 'E' }, { key: 'e', note: 'D#' },
            { key: 'd', note: 'E' }, { key: 'j', note: 'B' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }, { key: 'h', note: 'A' },
            { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 'h', note: 'A' }, { key: 'j', note: 'B' },
            { key: 'd', note: 'E' }, { key: 'y', note: 'G#' }, { key: 'j', note: 'B' }, { key: 'k', note: 'C' }
        ]
    },
    {
        id: 9,
        title: 'When the Saints',
        difficulty: 'beginner',
        notes: [
            { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 'f', note: 'F' }, { key: 'g', note: 'G' },
            { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 'f', note: 'F' }, { key: 'g', note: 'G' },
            { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 'f', note: 'F' }, { key: 'g', note: 'G' },
            { key: 'd', note: 'E' }, { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' },
            { key: 'd', note: 'E' }, { key: 'd', note: 'E' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' },
            { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 'g', note: 'G' }, { key: 'g', note: 'G' }, { key: 'f', note: 'F' },
            { key: 'd', note: 'E' }, { key: 'f', note: 'F' }, { key: 'g', note: 'G' },
            { key: 'd', note: 'E' }, { key: 'a', note: 'C' }, { key: 's', note: 'D' }, { key: 'a', note: 'C' }
        ]
    },
    {
        id: 10,
        title: 'Chord Practice',
        difficulty: 'intermediate',
        notes: [
            { key: 'a', note: 'C' }, { key: 'd', note: 'E' }, { key: 'g', note: 'G' },
            { key: 'f', note: 'F' }, { key: 'h', note: 'A' }, { key: 'k', note: 'C' },
            { key: 'g', note: 'G' }, { key: 'j', note: 'B' }, { key: 's', note: 'D' }
        ]
    }
];

// --- Learn Mode State ---
let learnModeActive = false;
let currentSong = null;
let currentNoteIndex = 0;
let learnStartTime = 0;
let correctNotes = 0;

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
let currentNoteColor = '#6366f1';
let themeResetTimer = null;

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
    elements.reverbBtn = document.getElementById('reverb-btn');
    elements.delayBtn = document.getElementById('delay-btn');
    elements.sustainIndicator = document.getElementById('sustain-indicator');
    elements.visualizer = document.getElementById('visualizer');
    elements.spectrum = document.getElementById('spectrum');
    
    // New toolbar elements
    elements.instrumentBtn = document.getElementById('instrument-btn');
    elements.instrumentDropdown = document.getElementById('instrument-dropdown');
    
    // Learn panel elements
    elements.learnToggleBtn = document.getElementById('learn-toggle-btn');
    elements.learnPanel = document.getElementById('learn-panel');
    elements.learnPanelClose = document.getElementById('learn-panel-close');
    elements.songList = document.getElementById('song-list');
    elements.filterBtns = document.querySelectorAll('.filter-btn');
    elements.keyGuideToggle = document.getElementById('key-guide-toggle');
    elements.keyGuideDrawer = document.getElementById('key-guide-drawer');
    
    // Note prompt strip elements
    elements.notePromptStrip = document.getElementById('note-prompt-strip');
    elements.promptKeys = document.getElementById('prompt-keys');
    elements.learnProgressFill = document.getElementById('learn-progress-fill');
    elements.learnProgressText = document.getElementById('learn-progress-text');
    elements.exitLearnBtn = document.getElementById('exit-learn-btn');
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
    if (!volumeNode) {
        buildAudioGraph();
        startVisualizer();
    }
}

function switchInstrument(presetKey) {
    if (!PRESETS[presetKey]) return;
    currentPreset = presetKey;
    disposeAllVoices();
}

function playNote(note) {
    if (!volumeNode) return;

    // iOS suspends AudioContext between gestures — always try to resume
    resumeAudioContext();

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

    // Check for learn mode progress
    if (learnModeActive) {
        checkLearnNote(note);
    }

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
    scheduleThemeReset();
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

    // "Now" line glow at bottom (reactive to current note color)
    const nowGrad = ctx.createLinearGradient(0, h - 4, 0, h);
    nowGrad.addColorStop(0, 'transparent');
    nowGrad.addColorStop(1, hexToRgba(currentNoteColor, 0.6));
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

        // All of these run synchronously within the user gesture —
        // critical for iOS to allow audio output.
        ensureAudioStarted();
        resumeAudioContext();
        activateKey(note);
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

// --- Note-Reactive Theme ---

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function applyNoteTheme(note) {
    const noteName = note.replace(/\d+/g, '');
    const theme = NOTE_THEME[noteName];
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.hover);
    root.style.setProperty('--primary-glow', theme.glow);
    root.style.setProperty('--glass-border', hexToRgba(theme.primary, 0.2));
    currentNoteColor = theme.primary;

    clearTimeout(themeResetTimer);
}

function scheduleThemeReset() {
    clearTimeout(themeResetTimer);
    themeResetTimer = setTimeout(resetNoteTheme, 1200);
}

function resetNoteTheme() {
    const root = document.documentElement;
    root.style.setProperty('--primary', '#6366f1');
    root.style.setProperty('--primary-hover', '#818cf8');
    root.style.setProperty('--primary-glow', 'rgba(99,102,241,0.4)');
    root.style.setProperty('--glass-border', 'rgba(99,102,241,0.15)');
    currentNoteColor = '#6366f1';
}

// --- Key Activation ---

function activateKey(note) {
    playNote(note);
    highlightKey(note, true);
    spawnRipple(note);
    reactParticlesToNote(note);
    pianoRollNoteOn(note);
    applyNoteTheme(note);
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
    scheduleThemeReset();
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

// --- Learn Panel & Learn Mode ---

function initLearnPanel() {
    // Populate song list
    renderSongList('all');
    
    // Toggle learn panel
    elements.learnToggleBtn?.addEventListener('click', () => {
        elements.learnPanel.classList.toggle('open');
    });
    
    // Close learn panel
    elements.learnPanelClose?.addEventListener('click', () => {
        elements.learnPanel.classList.remove('open');
    });
    
    // Difficulty filter buttons
    elements.filterBtns?.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSongList(btn.dataset.filter);
        });
    });
    
    // Key guide drawer toggle
    elements.keyGuideToggle?.addEventListener('click', () => {
        elements.keyGuideDrawer.classList.toggle('open');
    });
    
    // Exit learn mode button
    elements.exitLearnBtn?.addEventListener('click', () => {
        exitLearnMode();
    });
    
    // Instrument dropdown
    initInstrumentDropdown();
}

function initInstrumentDropdown() {
    const btn = elements.instrumentBtn;
    const dropdown = elements.instrumentDropdown;
    if (!btn || !dropdown) return;
    
    // Populate dropdown options
    dropdown.innerHTML = Object.entries(PRESETS).map(([key, preset]) => 
        `<div class="dropdown-item${key === currentPreset ? ' active' : ''}" data-preset="${key}">${preset.label}</div>`
    ).join('');
    
    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });
    
    // Select instrument
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        
        const preset = item.dataset.preset;
        switchInstrument(preset);
        
        // Update active state
        dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Update button text
        btn.querySelector('.btn-label').textContent = PRESETS[preset].label;
        dropdown.classList.remove('open');
    });
    
    // Close on outside click
    document.addEventListener('click', () => {
        dropdown.classList.remove('open');
    });
}

function renderSongList(filter) {
    if (!elements.songList) return;
    
    const filteredSongs = filter === 'all' 
        ? SONG_LIBRARY 
        : SONG_LIBRARY.filter(s => s.difficulty === filter);
    
    elements.songList.innerHTML = filteredSongs.map(song => `
        <div class="song-item" data-song-id="${song.id}">
            <div class="song-info">
                <span class="song-title">${song.title}</span>
                <span class="song-meta">${song.notes.length} notes • ${song.difficulty}</span>
            </div>
            <button class="play-song-btn" title="Start Learning">▶</button>
        </div>
    `).join('');
    
    // Add click handlers
    elements.songList.querySelectorAll('.song-item').forEach(item => {
        item.querySelector('.play-song-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const songId = parseInt(item.dataset.songId);
            startLearnMode(songId);
        });
    });
}

function startLearnMode(songId) {
    const song = SONG_LIBRARY.find(s => s.id === songId);
    if (!song) return;
    
    currentSong = song;
    currentNoteIndex = 0;
    correctNotes = 0;
    learnModeActive = true;
    learnStartTime = Date.now();
    
    // Close learn panel
    elements.learnPanel.classList.remove('open');
    
    // Show note prompt strip
    elements.notePromptStrip.classList.add('active');
    
    // Render note prompts
    renderNotePrompts();
    
    // Highlight first target key
    highlightTargetKey();
    
    // Update progress
    updateLearnProgress();
}

function renderNotePrompts() {
    if (!elements.promptKeys || !currentSong) return;
    
    elements.promptKeys.innerHTML = currentSong.notes.map((note, index) => `
        <span class="prompt-key ${index === 0 ? 'current' : ''}" data-index="${index}">
            <span class="prompt-note">${note.note}</span>
            <span class="prompt-hint">${note.key.toUpperCase()}</span>
        </span>
    `).join('');
}

function highlightTargetKey() {
    // Remove previous target highlight
    document.querySelectorAll('.key.target').forEach(k => k.classList.remove('target'));
    
    if (!currentSong || currentNoteIndex >= currentSong.notes.length) return;
    
    const targetNote = currentSong.notes[currentNoteIndex];
    const fullNote = resolveNote(targetNote.key);
    
    // Find the key element
    const keyEl = document.querySelector(`.key[data-note="${fullNote}"]`);
    if (keyEl) {
        keyEl.classList.add('target');
    }
}

function updateLearnProgress() {
    if (!currentSong) return;
    
    const progress = (currentNoteIndex / currentSong.notes.length) * 100;
    elements.learnProgressFill.style.width = `${progress}%`;
    elements.learnProgressText.textContent = `${currentNoteIndex}/${currentSong.notes.length}`;
}

function checkLearnNote(playedNote) {
    if (!learnModeActive || !currentSong) return;
    
    const targetNote = currentSong.notes[currentNoteIndex];
    const expectedNote = resolveNote(targetNote.key);
    
    if (playedNote === expectedNote) {
        // Correct note!
        correctNotes++;
        
        // Mark prompt as completed
        const promptEl = elements.promptKeys.querySelector(`[data-index="${currentNoteIndex}"]`);
        if (promptEl) {
            promptEl.classList.remove('current');
            promptEl.classList.add('completed');
        }
        
        // Move to next note
        currentNoteIndex++;
        
        if (currentNoteIndex >= currentSong.notes.length) {
            // Song complete!
            completeSong();
        } else {
            // Highlight next prompt and key
            const nextPrompt = elements.promptKeys.querySelector(`[data-index="${currentNoteIndex}"]`);
            if (nextPrompt) {
                nextPrompt.classList.add('current');
                // Scroll prompts to keep current visible
                nextPrompt.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
            highlightTargetKey();
            updateLearnProgress();
        }
    }
}

function completeSong() {
    learnModeActive = false;
    const duration = ((Date.now() - learnStartTime) / 1000).toFixed(1);
    
    // Remove target highlight
    document.querySelectorAll('.key.target').forEach(k => k.classList.remove('target'));
    
    // Update progress to 100%
    elements.learnProgressFill.style.width = '100%';
    elements.learnProgressText.textContent = `Complete! ${duration}s`;
    
    // Show completion message
    setTimeout(() => {
        alert(`🎉 Great job! You completed "${currentSong.title}" in ${duration} seconds!`);
    }, 300);
}

function exitLearnMode() {
    learnModeActive = false;
    currentSong = null;
    currentNoteIndex = 0;
    
    // Hide note prompt strip
    elements.notePromptStrip.classList.remove('active');
    
    // Remove target highlights
    document.querySelectorAll('.key.target').forEach(k => k.classList.remove('target'));
    
    // Reset progress
    elements.learnProgressFill.style.width = '0%';
    elements.learnProgressText.textContent = '0/0';
}

// --- Audio Start (browser autoplay policy + iOS fixes) ---

// Detect iOS/iPadOS — needed for platform-specific audio workarounds
const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Unlock iOS "playback" audio category by playing an HTML5 <audio> element.
// iOS Safari defaults to "ambient" category for Web Audio, which:
//   - Is silenced by the ringer/mute switch
//   - May route to earpiece instead of speaker
// Playing an <audio> element forces the session to "playback" category.
// We keep a persistent reference so iOS doesn't garbage-collect it too early.
let _iosUnlockAudio = null;
let _iosUnlockLastCall = 0;
function _unlockIOSPlaybackCategory() {
    if (!_isIOS) return;
    // Throttle: don't re-trigger more than once every 2 seconds
    const now = Date.now();
    if (now - _iosUnlockLastCall < 2000 && _iosUnlockLastCall > 0) return;
    _iosUnlockLastCall = now;
    try {
        // Create a short silent WAV with a tiny non-zero sample so iOS
        // recognises actual audio output and switches to "playback" category.
        const sampleRate = 8000;
        const numSamples = 4000; // 0.5s — longer to ensure category switch
        const bytesPerSample = 2;
        const dataSize = numSamples * bytesPerSample;
        const buf = new ArrayBuffer(44 + dataSize);
        const v = new DataView(buf);
        const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        w(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true);
        w(8, 'WAVE'); w(12, 'fmt ');
        v.setUint32(16, 16, true); v.setUint16(20, 1, true);
        v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
        v.setUint32(28, sampleRate * bytesPerSample, true);
        v.setUint16(32, bytesPerSample, true); v.setUint16(34, 16, true);
        w(36, 'data'); v.setUint32(40, dataSize, true);
        // Write a tiny non-zero pulse at the start — a truly silent buffer
        // may not trigger the audio category switch on some iOS versions.
        const samples = new Int16Array(buf, 44);
        samples[0] = 1;

        const blob = new Blob([buf], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.setAttribute('playsinline', '');
        a.setAttribute('webkit-playsinline', '');
        // Volume must be audible (not near-zero) for iOS to honour
        // the category switch; 1% is inaudible to humans but enough for iOS.
        a.volume = 0.01;
        a.play().catch(() => {});
        // Keep a reference so iOS doesn't GC it before playback finishes
        _iosUnlockAudio = a;
        a.addEventListener('ended', () => {
            try { URL.revokeObjectURL(url); } catch (_) {}
            // Don't remove — keep in memory so the session stays in "playback"
        });
    } catch (_) {}
}

// Play a silent buffer through the native AudioContext to "unlock" it on iOS.
// This is the technique used by Howler.js — iOS requires actual audio data
// to flow through the context during a user gesture before it will produce sound.
function _unlockWebAudioContext(ctx) {
    try {
        const silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
        const source = ctx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(ctx.destination);
        source.start(0);
        source.onended = () => { try { source.disconnect(); } catch (_) {} };
    } catch (_) {}
}

// Resume the audio context. Called on every user interaction because
// iOS aggressively suspends contexts between gestures.
function resumeAudioContext() {
    try {
        // Get the raw native AudioContext from Tone.js and resume it directly
        const toneCtx = Tone.context;
        const rawCtx = toneCtx.rawContext || toneCtx._context || toneCtx;
        if (rawCtx && rawCtx.resume) {
            rawCtx.resume();
        }
        if (toneCtx.resume) {
            toneCtx.resume();
        }
        // Re-trigger the iOS playback category unlock on every interaction.
        // iOS can revert to "ambient" category when the context is interrupted.
        if (_isIOS) {
            _unlockIOSPlaybackCategory();
        }
    } catch (_) {}
    // Tone.start() is safe to call repeatedly
    Tone.start();
}

// Called synchronously on the very first user interaction.
// This is where we create the AudioContext inside the user gesture (critical for iOS).
function ensureAudioStarted() {
    if (audioStarted) return;
    audioStarted = true;

    // Step 1: Switch iOS to "playback" audio category via HTML5 Audio
    _unlockIOSPlaybackCategory();

    // Step 2: Create a fresh AudioContext inside this user gesture.
    // On iOS Safari, an AudioContext MUST be created (or resumed) during a
    // user-initiated event (touchstart/click). Tone.js may have already
    // created one lazily — if it's suspended and we can't resume it, we
    // create a new one and inject it into Tone.js.
    try {
        const existingCtx = Tone.context;
        const rawCtx = existingCtx.rawContext || existingCtx._context || existingCtx;

        if (rawCtx && rawCtx.state === 'suspended') {
            rawCtx.resume();
        }

        // If still not running, create a brand-new AudioContext inside this gesture
        if (!rawCtx || rawCtx.state !== 'running') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const freshCtx = new AudioCtx();
                // Unlock the fresh context with a silent buffer
                _unlockWebAudioContext(freshCtx);
                // Tell Tone.js to use our context
                Tone.setContext(freshCtx);
            }
        } else {
            // Context exists and is running — just unlock it with a silent buffer
            _unlockWebAudioContext(rawCtx);
        }
    } catch (_) {
        // Fallback: just try Tone.start()
    }

    // Step 3: Call Tone.start() and resume
    Tone.start();
    resumeAudioContext();

    // Step 4: Build the audio graph now that context is unlocked
    if (!volumeNode) {
        buildAudioGraph();
        startVisualizer();
    }

    elements.overlay.classList.add('hidden');
}

// --- Initialization ---

function init() {
    cacheElements();

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (!audioStarted) {
            const key = e.key.toLowerCase();
            if (key in KEY_MAP || e.key === ' ') {
                ensureAudioStarted();
                resumeAudioContext();
            }
        } else {
            // Always resume on interaction — iOS suspends aggressively
            resumeAudioContext();
        }
        handleKeyDown(e);
    });

    document.addEventListener('keyup', handleKeyUp);

    // Also unlock on first touch anywhere on the page (catches taps on non-key areas)
    const unlockOnTouch = (e) => {
        if (!audioStarted) {
            ensureAudioStarted();
        }
        resumeAudioContext();
    };
    document.addEventListener('touchstart', unlockOnTouch, { once: false, passive: true });
    document.addEventListener('click', unlockOnTouch, { once: false });

    // Resume AudioContext when returning to the tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && audioStarted) {
            resumeAudioContext();
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

    // Effects
    elements.reverbBtn.addEventListener('click', toggleReverb);
    elements.delayBtn.addEventListener('click', toggleDelay);

    // Recording
    elements.recordBtn.addEventListener('click', toggleRecording);
    elements.playBtn.addEventListener('click', playRecording);
    elements.clearBtn.addEventListener('click', clearRecording);

    // Hamburger toggle for mobile toolbar
    const hamburger = document.getElementById('toolbar-hamburger');
    const toolbarControls = document.querySelector('.toolbar-controls');
    if (hamburger && toolbarControls) {
        hamburger.addEventListener('click', () => {
            const isOpen = toolbarControls.classList.toggle('open');
            hamburger.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', isOpen);
        });
    }

    // Learn Panel
    initLearnPanel();

    // Build piano
    buildPiano();
    initPianoRoll();

    // Rebuild piano on viewport resize (orientation change, etc.)
    // Black key positions are calculated from CSS custom properties at build time
    let resizeTimer;
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (Math.abs(window.innerWidth - lastWidth) > 10) {
                lastWidth = window.innerWidth;
                buildPiano();
            }
        }, 200);
    });

    // Set initial display values
    elements.volumeValue.textContent = currentVolume + '%';
    elements.octaveDisplay.textContent = baseOctave;
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    // initParticles();
});
