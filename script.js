/* ============================================================
   KeyMuse Piano - Application Logic
   Tone.js PolySynth, keyboard/mouse/touch input,
   recording/playback, octave/volume controls
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

// Black key positions relative to white key indices within one octave
// C#=0, D#=1, F#=3, G#=4, A#=5 (index of white key to the LEFT of the black key)
const BLACK_KEY_OFFSETS = [
    { note: 'C#', whiteIndex: 0 },
    { note: 'D#', whiteIndex: 1 },
    { note: 'F#', whiteIndex: 3 },
    { note: 'G#', whiteIndex: 4 },
    { note: 'A#', whiteIndex: 5 }
];

// --- State ---

let baseOctave = DEFAULT_OCTAVE;
let currentVolume = DEFAULT_VOLUME;
let isRecording = false;
let recordingData = [];
let recordingStartTime = 0;
let isPlaying = false;
let playbackTimeouts = [];
let activeKeys = new Set();
let activeNotes = new Map();
let audioStarted = false;
let synth = null;

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
}

// --- Audio Engine ---

function initAudio() {
    synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 16,
        options: {
            oscillator: { type: 'triangle8' },
            envelope: {
                attack: 0.015,
                decay: 1.5,
                sustain: 0.08,
                release: 1.0
            }
        }
    }).toDestination();

    updateVolume(currentVolume);
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
}

function deactivateKey(note) {
    stopNote(note);
    highlightKey(note, false);
}

function highlightKey(note, active) {
    const keyEl = elements.piano.querySelector('.key[data-note="' + note + '"]');
    if (keyEl) {
        keyEl.classList.toggle('active', active);
    }
}

function updateNoteDisplay(note) {
    elements.noteDisplay.textContent = note;
    elements.noteDisplay.classList.add('pop');
    setTimeout(() => elements.noteDisplay.classList.remove('pop'), 150);
}

// --- Keyboard Input ---

function handleKeyDown(e) {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();
    if (!(key in KEY_MAP)) return;
    if (activeKeys.has(key)) return;

    e.preventDefault();
    activeKeys.add(key);
    const note = resolveNote(key);
    activateKey(note);
}

function handleKeyUp(e) {
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

    // Play a silent HTML5 audio element to establish the media audio session.
    // This forces mobile browsers to route Web Audio through the main speaker
    // instead of the earpiece.
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
            if (key in KEY_MAP) {
                await ensureAudioStarted();
            }
        }
        handleKeyDown(e);
    });

    document.addEventListener('keyup', handleKeyUp);

    // Resume AudioContext when returning to the tab (browsers suspend it in background)
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
