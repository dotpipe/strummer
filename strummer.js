// strummer.js

let audioContext;
let selectedNotes = [];
let recordedSetups = [];
let currentStep = -1;
const NUM_FRETS = 24;

let isPlaying = false;
let currentDuration = 'quarter';
let isRestOrNote = false;
let tempo = 120;
let timeSignature = { beatsPerMeasure: 4, beatUnit: 4 };
let volume = 0.5;
let isUpstrum = false;

let plugins = [];

// Function to load plugins
function loadPlugins() {
    initializeBendPlugin();
    plugins.push(window.bendPlugin);
}

function removeTooltip(element) {
    const tooltip = element.querySelector('.tooltip');
    if (tooltip) {
        element.removeChild(tooltip);
    }
}

function loadSetup(setup) {
    selectedNotes.length = 0;
    const fretElements = document.querySelectorAll('.fret');
    fretElements.forEach(fretElement => {
        fretElement.classList.remove('selected');
        fretElement.className = 'fret';
        removeTooltip(fretElement);
    });

    setup.forEach(note => {
        const fretElement = document.querySelector(`.fret[data-string="${note.string}"][data-fret="${note.fret}"]`);
        if (fretElement) {
            selectedNotes.push(note);
            fretElement.classList.add('selected');
            addTooltip(fretElement);
        }
    });

    updateAllTooltips();
}

function findNoteIndex(array, note) {
    return array.findIndex(item => item.string === note.string && item.fret === note.fret);
}

// Function to set the time signature
function setTimeSignature(beatsPerMeasure, beatUnit) {
    timeSignature.beatsPerMeasure = beatsPerMeasure;
    timeSignature.beatUnit = beatUnit;
    console.log(`Time signature set to ${beatsPerMeasure}/${beatUnit}`);
}

// Function to set the note duration
function setNoteDuration(duration) {
    currentDuration = duration;
    isRestOrNote = false;
    updateButtonUI(duration, 'note');
}

// Function to set the rest duration
function setRestDuration(duration) {
    currentDuration = duration;
    isRestOrNote = true;
    updateButtonUI(duration, 'rest');
}

// Function to set the strum direction
function setStrum(strum) {
    isUpstrum = strum === 'up';
}

// Function to update the tempo
function updateTempo(newTempo) {
    tempo = newTempo;
    console.log(`Tempo set to ${tempo} BPM`);
}

// Function to play a note or rest
function playNoteOrRest() {
    const durationFactor = calculateDuration();
    const durationInMilliseconds = (60 / tempo) * 1000 * (4 / timeSignature.beatUnit) * durationFactor;

    if (isRestOrNote) {
        console.log(`Rest for ${durationFactor} of a measure (${durationInMilliseconds} ms)`);
    } else {
        console.log(`Note for ${durationFactor} of a measure (${durationInMilliseconds} ms)`);
    }

    setTimeout(() => {
        console.log(`Finished playing ${isRestOrNote ? 'rest' : 'note'}`);
    }, durationInMilliseconds);
}

// Function to update the button UI
function updateButtonUI(duration, type) {
    const buttonId = `${type === 'note' ? '' : 'rest-'}${duration}`;
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(button => {
        if (button.id === buttonId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Function to highlight the active button
function highlightActiveButton() {
    document.querySelectorAll('.button').forEach(button => button.classList.remove('active'));

    if (isRestOrNote) {
        const restButton = document.getElementById(currentDuration + '-rest');
        if (restButton) {
            restButton.classList.add('active');
        } else {
            console.error(`Rest button with id ${currentDuration + '-rest'} not found`);
        }
    } else {
        const noteButton = document.getElementById(currentDuration + '-note');
        if (noteButton) {
            noteButton.classList.add('active');
        } else {
            console.error(`Note button with id ${currentDuration + '-note'} not found`);
        }
    }
}

// Function to play the sequence
function playSequence() {
    if (recordedSetups.length > 0) {
        recordedSetups.forEach((setup, index) => {
            setTimeout(() => {
                playSetup(setup);
            }, index * 200);
        });
    } else {
        alert('No setups recorded.');
    }
}

// Function to save the sequence
function saveSequence() {
    var step = 0;
    const sequenceData = JSON.stringify({
        setups: recordedSetups.map(setup => setup.map(note => ({
            step: step,
            string: note.string,
            fret: note.fret,
            duration: note.duration,
            isRest: note.isRest,
            strum: isUpstrum ? 'up' : 'down'
        }), step++)),
        tempo,
        timeSignature,
        volume,
        plugins: plugins.map(plugin => plugin.getSettings())
    });
    const blob = new Blob([sequenceData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'song_sequence.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Function to load the sequence
function loadSequence(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const sequenceData = e.target.result;
        const parsedSequence = JSON.parse(sequenceData);

        tempo = parsedSequence.tempo;
        timeSignature = parsedSequence.timeSignature;
        volume = parsedSequence.volume;

        recordedSetups = parsedSequence.setups.map(setup => setup.map(note => ({
            step: note.step,
            string: note.string,
            fret: note.fret,
            duration: note.duration,
            isRest: note.isRest,
            strum: note.strum
        })));

        // Update UI elements with loaded data
        document.getElementById('tempo').value = tempo;
        document.querySelector(`input[name="timeSignature"][value="${timeSignature.beatsPerMeasure}/${timeSignature.beatUnit}"]`).checked = true;
        document.getElementById('volume-slider').value = volume * 100;
        document.getElementById('volume-value').innerText = volume * 100;

        currentStep = 0;
        loadSetup(recordedSetups[currentStep]);
        updateCurrentStepDisplay();

        parsedSequence.plugins.forEach(pluginConfig => {
            const plugin = plugins.find(p => p.name === pluginConfig.name);
            if (plugin) plugin.applySettings(pluginConfig.settings);
        });
    };
    reader.readAsText(file);
}
function generateFretboard() {
    for (let string = 0; string < 6; string++) {
        const stringDiv = document.createElement('div');
        stringDiv.className = 'string';

        for (let fret = 0; fret < NUM_FRETS; fret++) {
            const fretDiv = document.createElement('div');
            fretDiv.className = 'fret';
            fretDiv.dataset.string = string;
            fretDiv.dataset.fret = fret;
            fretDiv.dataset.note = calculateNoteName(string, fret);
            fretDiv.classList.add(`note-${calculateNoteName(string, fret)}`);
            fretDiv.addEventListener('click', toggleNote);
            stringDiv.appendChild(fretDiv);
        }

        document.getElementById('fretboard').appendChild(stringDiv);
    }
}

// Load plugins on startup
loadPlugins();

document.getElementById('startAudio').addEventListener('click', initAudioContext);
document.getElementById('recordSetup').addEventListener('click', recordSetup);
document.getElementById('updateSetup').addEventListener('click', updateSetup);
document.getElementById('playUpStrum').addEventListener('click', () => setStrum('down'));
document.getElementById('playDownStrum').addEventListener('click', () => setStrum('up'));
document.getElementById('playSequence').addEventListener('click', playSequence);
document.getElementById('prevStep').addEventListener('click', prevStep);
document.getElementById('nextStep').addEventListener('click', nextStep);
document.getElementById('tempo').addEventListener('click', (e) => updateTempo(e.target.value));
document.getElementById('volume-slider').addEventListener('input', (e) => updateVolume(e.target.value));

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        document.getElementById('startAudio').style.display = 'none';
        generateFretboard();
    }
}

function updateVolume(newVolume) {
    volume = newVolume / 100;
    document.getElementById('volume-value').innerText = newVolume;
    console.log(`Volume set to ${volume}`);
}

function playSetup(setup) {
    selectedNotes.length = 0;
    const fretElements = document.querySelectorAll('.fret');
    fretElements.forEach(fretElement => {
        fretElement.classList.remove('selected');
        fretElement.className = 'fret';
        removeTooltip(fretElement);
    });

    setup.forEach(note => {
        const fretElement = document.querySelector(`.fret[data-string="${note.string}"][data-fret="${note.fret}"]`);
        if (fretElement) {
            selectedNotes.push(note);
            fretElement.classList.add('selected');
            addTooltip(fretElement);
            if (!note.isRest) {
                playSoundFrequency(calculateFrequency(note.string, note.fret), note.duration);
            }
            else {
                const yTime = audioContext.currentTime + note.duration;
                while (audioContext.currentTime < yTime);
            }
        }
    });

    updateAllTooltips();
    if (isUpstrum) {
        playSelectedNotesAscending();
    } else {
        playSelectedNotesDescending();
    }
}

document.getElementById('startAudio').addEventListener('click', initAudioContext);
document.getElementById('recordSetup').addEventListener('click', recordSetup);
document.getElementById('updateSetup').addEventListener('click', updateSetup);
document.getElementById('playUpStrum').addEventListener('click', () => setStrum('down'));
document.getElementById('playDownStrum').addEventListener('click', () => setStrum('up'));
document.getElementById('playSequence').addEventListener('click', playSequence);
document.getElementById('prevStep').addEventListener('click', prevStep);
document.getElementById('nextStep').addEventListener('click', nextStep);
document.getElementById('tempo').addEventListener('click', (e) => updateTempo(e.target.value));

function calculateNoteName(string, fret) {
    const NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
    const openStringNotes = ['E', 'B', 'G', 'D', 'A', 'E']; // Note names of open strings
    const baseNoteIndex = NOTES.indexOf(openStringNotes[string]);
    const noteIndex = (baseNoteIndex + fret) % 12;
    return NOTES[noteIndex];
}

function playSelectedNotesAscending() {
    if (!audioContext) return;

    const sortedNotes = selectedNotes.slice().sort((a, b) => {
        if (a.fret !== b.fret) {
            return a.fret - b.fret;
        }
        return a.string - b.string;
    });

    // Play sorted notes with a delay between each
    sortedNotes.forEach((note, index) => {
        const frequency = calculateFrequency(note.string, note.fret);
        console.log(`Playing frequency (Ascending): ${frequency} Hz`);
        const timeoutId = setTimeout(() => playSoundFrequency(frequency, 1), index * 200);
        playTimeouts.push(timeoutId);
    });
}

function playSelectedNotesDescending() {
    if (!audioContext) return;

    const sortedNotes = selectedNotes.slice().sort((a, b) => {
        if (a.fret !== b.fret) {
            return b.fret - a.fret;
        }
        return b.string - a.string;
    });

    // Play sorted notes with a delay between each
    sortedNotes.forEach((note, index) => {
        const frequency = calculateFrequency(note.string, note.fret);
        console.log(`Playing frequency (Descending): ${frequency} Hz`);
        const timeoutId = setTimeout(() => playSoundFrequency(frequency, 1), index * 200);
        playTimeouts.push(timeoutId);
    });
}

function compareStrums() {
    if (!audioContext) return;

    // Play ascending strum
    playSelectedNotesAscending();
    document.getElementById('indicator').innerText = 'Playing Ascending Strum...';

    // Pause and then play descending strum
    const totalDuration = selectedNotes.length * 200;
    const compareTimeoutId = setTimeout(() => {
        document.getElementById('indicator').innerText = 'Playing Descending Strum...';
        playSelectedNotesDescending();
    }, totalDuration + 500);
    playTimeouts.push(compareTimeoutId);

    // Show feedback options after both strums are played
    const feedbackTimeoutId = setTimeout(() => {
        document.getElementById('indicator').innerText = '';
        document.getElementById('feedback').style.display = 'block';
    }, totalDuration * 2 + 1000);
    playTimeouts.push(feedbackTimeoutId);
}

function recordFeedback(strumType) {
    console.log(`User preferred: ${strumType} Strum`);
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('indicator').innerText = `You preferred: ${strumType} Strum`;
    note.strum = strumType == 'up' ? false : true;
}

function addTooltip(element) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    element.appendChild(tooltip);
}

function calculateInterval(note, baseNote) {
    if (!baseNote) return '';

    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const baseNoteName = calculateNoteName(baseNote.string, baseNote.fret);
    const noteName = calculateNoteName(note.string, note.fret);

    const baseIndex = NOTES.indexOf(baseNoteName);
    const noteIndex = NOTES.indexOf(noteName);

    let interval = (noteIndex - baseIndex + 12) % 12;
    switch (interval) {
        case 0: return 'Root';
        case 1: return 'm2';
        case 2: return 'M2';
        case 3: return 'm3';
        case 4: return 'M3';
        case 5: return 'P4';
        case 6: return 'd5';
        case 7: return 'P5';
        case 8: return 'm6';
        case 9: return 'M6';
        case 10: return 'm7';
        case 11: return 'M7';
        default: return '';
    }
}

function recordSetup() {
    if (selectedNotes.length > 0) {
        const setup = selectedNotes.slice();
        setup.forEach(note => {
            note.strum = isUpstrum ? 'up' : 'down';
        });
        recordedSetups.push(setup);
        currentStep = recordedSetups.length - 1;
        updateCurrentStepDisplay();
        alert('Setup recorded!');
    } else {
        alert('No notes selected to record.');
    }
}

function updateSetup() {
    if (currentStep >= 0 && currentStep < recordedSetups.length) {
        if (selectedNotes.length > 0) {
            recordedSetups[currentStep] = selectedNotes.slice();
            recordedSetups[currentStep].forEach(note => {
                note.strum = isUpstrum ? 'up' : 'down';
            });
            alert('Setup updated!');
        } else {
            alert('No notes selected to update.');
        }
    } else {
        alert('No setup selected to update.');
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        loadSetup(recordedSetups[currentStep]);
        updateCurrentStepDisplay();
    } else {
        alert('No previous step.');
    }
}

function nextStep() {
    if (currentStep < recordedSetups.length - 1) {
        currentStep++;
        loadSetup(recordedSetups[currentStep]);
        updateCurrentStepDisplay();
    } else {
        alert('No next step.');
    }
}

document.getElementById('startAudio').addEventListener('click', initAudioContext);
document.getElementById('recordSetup').addEventListener('click', recordSetup);
document.getElementById('updateSetup').addEventListener('click', updateSetup);
document.getElementById('playUpStrum').addEventListener('click', () => setStrum('down'));
document.getElementById('playDownStrum').addEventListener('click', () => setStrum('up'));
document.getElementById('playSequence').addEventListener('click', playSequence);
document.getElementById('prevStep').addEventListener('click', prevStep);
document.getElementById('nextStep').addEventListener('click', nextStep);
document.getElementById('tempo').addEventListener('click', (e) => updateTempo(e.target.value));

function toggleNote(event) {
    const string = parseInt(event.target.dataset.string);
    const fret = parseInt(event.target.dataset.fret);
    const note = { string, fret, duration: currentDuration, isRest: isRestOrNote };

    const index = findNoteIndex(selectedNotes, note);
    if (index !== -1) {
        selectedNotes.splice(index, 1);
        event.target.classList.remove('selected');
        event.target.className = 'fret';
        removeTooltip(event.target);
    } else {
        selectedNotes.push(note);
        event.target.classList.add('selected');
        addTooltip(event.target);
        if (!isRestOrNote) {
            playSoundFrequency(calculateFrequency(string, fret), currentDuration);
        } else {
            console.log(`Rest for ${currentDuration} duration`);
        }
    }
    updateAllTooltips();
}

let playTimeouts = [];

function calculateFrequency(string, fret) {
    const OPEN_STRING_FREQUENCIES = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41];
    const baseFrequency = OPEN_STRING_FREQUENCIES[string];
    return baseFrequency * Math.pow(2, fret / 12);
}

function playSoundFrequency(frequency, duration) {
    
    var oscillator = (audioContext) ? audioContext.createOscillator() : null;
    if (oscillator == null) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = (audioContext) ? audioContext.createOscillator() : null;
    }
    var gainNode = audioContext.createGain();


    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);

    const durationInSeconds = calculateDurationInSeconds(duration);
    const endTime = audioContext.currentTime + durationInSeconds;


    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1); //durationInSeconds);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(endTime);
}

function calculateDurationInSeconds(duration) {
    const durationFactors = {
        whole: 4,
        half: 2,
        quarter: 1,
        eighth: 0.5,
        sixteenth: 0.25,
        thirtysecond: 0.125,
        sixtyfourth: 0.0625
    };
    return (60 / tempo) * durationFactors[duration];
}

function stopPlayback() {
    if (audioContext) {
        // Clear all timeouts to stop animations
        playTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        playTimeouts = [];

        audioContext.close();
        audioContext = null;
        isPlaying = false;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Playback stopped.");
        document.getElementById('indicator').innerText = '';
        document.getElementById('feedback').style.display = 'none';
    }
}

function findNoteIndex(array, note) {
    return array.findIndex(item => item.string === note.string && item.fret === note.fret);
}

function updateAllTooltips() {
    const baseNote = selectedNotes.length > 0 ? selectedNotes[0] : null;

    selectedNotes.forEach(note => {
        const fretElement = document.querySelector(`.fret[data-string="${note.string}"][data-fret="${note.fret}"]`);
        if (fretElement) {
            const tooltip = fretElement.querySelector('.tooltip');
            if (tooltip) {
                const interval = calculateInterval(note, baseNote);
                tooltip.innerText = interval;
                updateIntervalColor(fretElement, interval);
            }
        }
    });
}

function updateIntervalColor(element, interval) {
    element.classList.remove('interval-root', 'interval-m2', 'interval-M2', 'interval-m3', 'interval-M3', 'interval-P4', 'interval-d5', 'interval-P5', 'interval-m6', 'interval-M6', 'interval-m7', 'interval-M7');
    switch (interval) {
        case 'Root':
            element.classList.add('interval-root');
            break;
        case 'm2':
            element.classList.add('interval-m2');
            break;
        case 'M2':
            element.classList.add('interval-M2');
            break;
        case 'm3':
            element.classList.add('interval-m3');
            break;
        case 'M3':
            element.classList.add('interval-M3');
            break;
        case 'P4':
            element.classList.add('interval-P4');
            break;
        case 'd5':
            element.classList.add('interval-d5');
            break;
        case 'P5':
            element.classList.add('interval-P5');
            break;
        case 'm6':
            element.classList.add('interval-m6');
            break;
        case 'M6':
            element.classList.add('interval-M6');
            break;
        case 'm7':
            element.classList.add('interval-m7');
            break;
        case 'M7':
            element.classList.add('interval-M7');
            break;
        default:
            break;
    }
}

function nextStep() {
    if (currentStep < recordedSetups.length - 1) {
        currentStep++;
        loadSetup(recordedSetups[currentStep]);
        updateCurrentStepDisplay();
    } else {
        alert('No next step.');
    }
}


// Event listener for the 
// 'beforeunload' event
window.addEventListener('beforeunload',
    function (e) {
        {
            // Cancel the event and
            // show alert that the unsaved
            // changes would be lost
            e.preventDefault();
            e.returnValue = '';
        }
    });

function updateCurrentStepDisplay() {
    document.getElementById('currentStep').innerText = `Step: ${currentStep + 1}`;
}
