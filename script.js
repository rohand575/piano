/* ============================================================
   KeyMuse Piano - Application Logic
   Tone.js PolySynth, keyboard/mouse/touch input,
   recording/playback, octave/volume controls,
   instrument presets, effects, sustain, visualizer
   ============================================================ */

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
let synth = null;
let reverbNode = null;
let delayNode = null;
let analyserNode = null;
let reverbActive = false;
let delayActive = false;
let sustainActive = false;
let sustainedNotes = new Set();
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
}

// --- Audio Engine ---

function buildAudioGraph(presetKey) {
    const preset = PRESETS[presetKey] || PRESETS.piano;

    // Dispose old nodes
    if (synth) { synth.disconnect(); synth.dispose(); }
    if (reverbNode) { reverbNode.disconnect(); reverbNode.dispose(); }
    if (delayNode) { delayNode.disconnect(); delayNode.dispose(); }
    if (analyserNode) { analyserNode.disconnect(); analyserNode.dispose(); }

    // Create new synth
    synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 16,
        options: {
            oscillator: preset.oscillator,
            envelope: preset.envelope
        }
    });

    // Create effects
    reverbNode = new Tone.Reverb({ decay: 2.5, wet: reverbActive ? 0.4 : 0 });
    delayNode = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: delayActive ? 0.35 : 0 });
    analyserNode = new Tone.Analyser('waveform', 256);

    // Chain: synth -> reverb -> delay -> analyser -> destination
    synth.chain(reverbNode, delayNode, analyserNode, Tone.getDestination());

    updateVolume(currentVolume);
}

function initAudio() {
    buildAudioGraph(currentPreset);
    startVisualizer();
}

function switchInstrument(presetKey) {
    if (!PRESETS[presetKey]) return;
    currentPreset = presetKey;
    if (synth) {
        buildAudioGraph(presetKey);
    }
}

function playNote(note) {
    if (!synth) return;
    synth.triggerAttack(note, Tone.now());
    updateNoteDisplay(note);

    if (isRecording) {
        activeNotes.set(note, performance.now());
    }
}

function stopNote(note) {
    if (!synth) return;
    synth.triggerRelease(note, Tone.now());

    if (isRecording && activeNotes.has(note)) {
        const startTime = activeNotes.get(note);
        const duration = performance.now() - startTime;
        const relativeStart = startTime - recordingStartTime;
        recordingData.push({ note, time: relativeStart, duration });
        activeNotes.delete(note);
    }
}

function updateVolume(percent) {
    if (!synth) return;
    if (percent === 0) {
        synth.volume.value = -Infinity;
    } else {
        synth.volume.value = -40 + (percent / 100) * 40;
    }
    currentVolume = percent;
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

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
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
    }

    draw();
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

    // Set initial display values
    elements.volumeValue.textContent = currentVolume + '%';
    elements.octaveDisplay.textContent = baseOctave;
}

document.addEventListener('DOMContentLoaded', init);
