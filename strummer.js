let audioContext;
let selectedNotes = [];
let recordedSetups = [];
let currentStep = -1;
const NUM_FRETS = 24;
let distortionNode;

let isPlaying = false;
let currentDuration = 'quarter';
let isRestOrNote = false;
let tempo = 120;
let timeSignature = { beatsPerMeasure: 4, beatUnit: 4 };
let volume = 0.5;
let isUpstrum = false;
const pluginRegistry = {};

const audioContextOptions = {
    latencyHint: 'playback',
    sampleRate: 44100,
    // Increase the buffer size for more memory allocation
    bufferSize: 1256000 // or 32768 for even more memory
};

function installPlugin(pluginName, pluginCode) {
    try {
        // Create a sandboxed environment for the plugin
        const sandbox = {
            console: console,
            document: document,
            audioContext: audioContext,
            // Add any other necessary global objects or functions
        };

        // Execute the plugin code in the sandboxed environment
        const pluginFunction = new Function('sandbox', `with (sandbox) { ${pluginCode} }`);
        const plugin = pluginFunction(sandbox);

        // Validate the plugin structure
        if (typeof plugin === 'object' && typeof plugin.init === 'function' && typeof plugin.process === 'function') {
            pluginRegistry[pluginName] = plugin;
            plugin.init();
            console.log(`Plugin ${pluginName} installed successfully.`);
        } else {
            throw new Error(`Invalid plugin structure for ${pluginName}.`);
        }
    } catch (error) {
        console.error(`Error installing plugin ${pluginName}:`, error);
    }
}

document.getElementById('installPluginBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('pluginFile');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const pluginCode = e.target.result;
            const pluginName = file.name.replace('.js', '');
            installPlugin(pluginName, pluginCode);
        };
        reader.readAsText(file);
    }
});
async function saveComplexSequence() {
    const zip = new JSZip();

    // Save main sequence data
    const sequenceData = JSON.stringify({
        version: 4,
        setups: recordedSetups,
        tempo,
        timeSignature,
        volume
    });
    zip.file("sequence.json", sequenceData);

    // Save tablature
    const tablature = generateTablature();
    zip.file("tablature.txt", tablature);

    // Save plugin data
    Object.keys(pluginRegistry).forEach(pluginName => {
        const pluginData = JSON.stringify(pluginRegistry[pluginName].getSettings());
        zip.file(`plugins/${pluginName}.json`, pluginData);
    });

    // Generate the ZIP file
    const content = await zip.generateAsync({ type: "blob" });

    // Save the file
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guitar_sequence.gseq';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
async function loadComplexSequence(file) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    // Load main sequence data
    const sequenceData = JSON.parse(await contents.file("sequence.json").async("string"));
    recordedSetups = sequenceData.setups;
    tempo = sequenceData.tempo;
    timeSignature = sequenceData.timeSignature;
    volume = sequenceData.volume;

    // Load plugin data
    const pluginFiles = Object.keys(contents.files).filter(filename => filename.startsWith('plugins/'));
    for (const pluginFile of pluginFiles) {
        const pluginName = pluginFile.replace('plugins/', '').replace('.json', '');
        if (pluginRegistry[pluginName]) {
            const pluginData = JSON.parse(await contents.file(pluginFile).async("string"));
            pluginRegistry[pluginName].applySettings(pluginData);
        }
    }


    // Update UI and current setup
    updateUIWithLoadedData();
    currentStep = 0;
    loadSetup(recordedSetups[currentStep]);
    updateCurrentStepDisplay();
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
let currentPlaybackTime = 0;
function playSequence() {
    if (recordedSetups.length === 0) {
        alert('No setups recorded.');
        return;
    }

    // Stop any ongoing playback
    stopPlayback();

    const startTime = audioContext.currentTime;
    const secondsPerBeat = 60 / tempo;
    const secondsPerStep = secondsPerBeat * (timeSignature.beatUnit / 4);

    recordedSetups.forEach((setup, stepIndex) => {
        const stepStartTime = startTime + (stepIndex * secondsPerStep);
        setTimeout(() => {
            updateCurrentStepDisplay(stepIndex);
            playSetup(setup, stepStartTime);
        }, (stepStartTime - startTime) * 1000);
    });
}


function playSetup(setup, startTime) {
    const strumDirection = isUpstrum ? 'up' : 'down';
    const strumDelay = 2 // 20ms delay between each string

    const sortedNotes = setup.forEach((a, b) => {
        if (strumDirection === 'up') {
            return b;
        } else {
            return a; //a.string - b.string;
        }
    });

    sortedNotes.forEach((note, index) => {
        if (!note.isRest) {
            // const frequency = calculateFrequency(note.string, note.fret);
            const noteStartTime = startTime + (index * strumDelay);
            playSoundFrequency(frequency, note.duration, noteStartTime);
        }
    });
}

function calculateSetupDuration(setup) {
    const longestNoteDuration = Math.max(...setup.map(note => calculateDurationInSeconds(note.duration)));
    return longestNoteDuration;
}


// Function to save the sequence
function saveSequence() {
    var step = 0;
    const tablature = generateTablature();
    const pluginData = Object.keys(pluginRegistry).map(pluginName => ({
        name: pluginName,
        settings: pluginRegistry[pluginName].getSettings(),
        enabled: pluginRegistry[pluginName].isEnabled()
    }));

    const sequenceData = JSON.stringify({
        version: 5,
        setups: recordedSetups.map(setup => setup.map(note => ({
            step: step,
            string: note.string,
            fret: note.fret,
            duration: note.duration,
            isRest: note.isRest,
            strum: isUpstrum ? 'up' : 'down',
            plugins: Object.keys(pluginRegistry).reduce((acc, pluginName) => {
                acc[pluginName] = pluginRegistry[pluginName].getNoteSettings(note);
                return acc;
            }, {})
        }), step++)),
        tempo,
        timeSignature,
        volume,
        plugins: pluginData,
        tablature: tablature
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

// Function to parse the tablature and convert it to JSON
function parseTablatureToJSON(tablature) {
    const lines = tablature.split('\n');
    const stringMap = ['E', 'A', 'D', 'G', 'B', 'e'];
    const sequences = [];

    lines.forEach((line, lineIndex) => {
        if (line.trim() === '') return;

        const stringIndex = stringMap.indexOf(line[0]);
        if (stringIndex === -1) return;

        const notes = line.split('|')[1].trim().split('-');
        notes.forEach((note, noteIndex) => {
            if (note !== '' && !isNaN(note)) {
                sequences.push({
                    string: stringIndex + 1,
                    fret: parseInt(note, 10),
                    duration: 'eighth', // Assume eighth notes for simplicity
                    isRest: false,
                    strum: 'up' // Assume upstrum for simplicity
                });
            }
        });
    });

    return sequences;
}

// Function to load the sequence from a tablature file
function loadSequence(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const sequenceData = JSON.parse(e.target.result);

        tempo = sequenceData.tempo;
        timeSignature = sequenceData.timeSignature;
        volume = sequenceData.volume;

        // Load plugin data
        sequenceData.plugins.forEach(pluginData => {
            if (pluginRegistry[pluginData.name]) {
                pluginRegistry[pluginData.name].applySettings(pluginData.settings);
                pluginRegistry[pluginData.name].setEnabled(pluginData.enabled);
            }
        });

        // Load sequence setups
        recordedSetups = sequenceData.setups.map(setup => setup.map(note => {
            const loadedNote = {
                step: note.step,
                string: note.string,
                fret: note.fret,
                duration: note.duration,
                isRest: note.isRest,
                strum: note.strum === 'up'
            };

            // Apply plugin-specific note settings
            Object.keys(note.plugins).forEach(pluginName => {
                if (pluginRegistry[pluginName]) {
                    pluginRegistry[pluginName].applyNoteSettings(loadedNote, note.plugins[pluginName]);
                }
            });

            return loadedNote;
        }));

        // Update UI
        updateUIWithLoadedData();
        currentStep = 0;
        loadSetup(recordedSetups[currentStep]);
        updateCurrentStepDisplay();
    };
    reader.readAsText(file);
}

function updateUIWithLoadedData() {
    document.getElementById('tempo').value = tempo;
    document.querySelector(`input[name="timeSignature"][value="${timeSignature.beatsPerMeasure}/${timeSignature.beatUnit}"]`).checked = true;
    document.getElementById('volume-slider').value = volume * 100;
    document.getElementById('volume-value').innerText = volume * 100;

    // Update plugin UI elements if necessary
    Object.keys(pluginRegistry).forEach(pluginName => {
        if (typeof pluginRegistry[pluginName].updateUI === 'function') {
            pluginRegistry[pluginName].updateUI();
        }
    });
}


function handleJsonSequence(content) {
    const parsedSequence = JSON.parse(content);

    tempo = parsedSequence.tempo;
    timeSignature = parsedSequence.timeSignature;
    volume = parsedSequence.volume;

    recordedSetups = parsedSequence.setups.map(setup => setup.map(note => ({
        step: note.step,
        string: note.string,
        fret: note.fret,
        duration: note.duration,
        isRest: note.isRest,
        strum: note.strum,
        distortion: parsedSequence.version === 2 ? note.distortion : 0 // Handle new distortion property
    })));

    // Update UI elements with loaded data
    document.getElementById('tempo').value = tempo;
    document.querySelector(`input[name="timeSignature"][value="${timeSignature.beatsPerMeasure}/${timeSignature.beatUnit}"]`).checked = true;
    document.getElementById('volume-slider').value = volume * 100;
    document.getElementById('volume-value').innerText = volume * 100;

    // Set distortion if available
    if (parsedSequence.version === 2 && recordedSetups[0][0].distortion) {
        document.getElementById('distortion-slider').value = recordedSetups[0][0].distortion;
        updateDistortion({ target: { value: recordedSetups[0][0].distortion } });
    }

    currentStep = 0;
    loadSetup(recordedSetups[currentStep]);
    updateCurrentStepDisplay();

    parsedSequence.plugins.forEach(pluginConfig => {
        const plugin = plugins.find(p => p.name === pluginConfig.name);
        if (plugin) plugin.applySettings(pluginConfig.settings);
    });
}


function handleTablatureInput(tablature) {
    const parsedSequence = parseTablatureToJSON(tablature);
    recordedSetups = parsedSequence;
    currentStep = 0;
    loadSetup(recordedSetups[currentStep]);
    updateCurrentStepDisplay();
}

function parseTablatureToJSON(tablature) {
    const lines = tablature.split('\n');
    const stringMap = ['e', 'B', 'G', 'D', 'A', 'E'];
    const sequence = [];

    for (let i = 0; i < lines[0].length; i += 3) {
        const setup = [];
        lines.forEach((line, lineIndex) => {
            const stringIndex = 5 - stringMap.indexOf(line[0]); // Reverse string index
            const fret = line.substring(i + 2, i + 5).trim();
            if (fret !== '') {
                setup.push({
                    string: stringIndex,
                    fret: parseInt(fret, 10),
                    duration: 'eighth', // Default duration
                    isRest: false,
                    strum: 'down' // Default strum direction
                });
            }
        });
        if (setup.length > 0) {
            sequence.push(setup);
        }
    }

    return sequence;
}

function parseTablatureToJSON(tablature) {
    const lines = tablature.split('\n');
    const stringMap = ['e', 'B', 'G', 'D', 'A', 'E'];
    const sequence = [];

    for (let i = 0; i < lines[0].length; i += 3) {
        const setup = [];
        lines.forEach((line, lineIndex) => {
            const stringIndex = 5 - stringMap.indexOf(line[0]); // Reverse string index
            const fret = line.substring(i + 2, i + 5).trim();
            if (fret !== '') {
                setup.push({
                    string: stringIndex,
                    fret: parseInt(fret, 10),
                    duration: 'eighth', // Default duration
                    isRest: false,
                    strum: 'down' // Default strum direction
                });
            }
        });
        if (setup.length > 0) {
            sequence.push(setup);
        }
    }

    return sequence;
}

// Function to load the sequence
function loadSequence(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;

        if (content.trim().startsWith('{')) {
            // It's a JSON sequence
            handleJsonSequence(content);
        } else {
            // It's a tablature
            handleTablatureInput(content);
        }
    };
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

document.getElementById('startAudio').addEventListener('click', initAudioContext);
document.getElementById('recordSetup').addEventListener('click', recordSetup);
document.getElementById('updateSetup').addEventListener('click', updateSetup);
document.getElementById('playUpStrum').addEventListener('click', () => {
    isUpstrum = true;
    playSetup(selectedNotes, audioContext.currentTime);
});

document.getElementById('playDownStrum').addEventListener('click', () => {
    isUpstrum = false;
    playSetup(selectedNotes, audioContext.currentTime);
});

document.getElementById('playSequence').addEventListener('click', playSequence);
document.getElementById('prevStep').addEventListener('click', prevStep);
document.getElementById('nextStep').addEventListener('click', nextStep);
document.getElementById('tempo').addEventListener('click', (e) => updateTempo(e.target.value));
document.getElementById('volume-slider').addEventListener('input', (e) => updateVolume(e.target.value));

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)(audioContextOptions);
        document.getElementById('startAudio').style.display = 'none';
        generateFretboard();
    }
    else {
        generateFretboard();
        document.getElementById('startAudio').style.display = 'none';
    }
}

function updateVolume(newVolume) {
    volume = newVolume / 100;
    document.getElementById('volume-value').innerText = newVolume;
    console.log(`Volume set to ${volume}`);
}

function playSetup(setup) {
    const currentTime = audioContext.currentTime;
    const strumDirection = isUpstrum ? 'up' : 'down';
    const strumDelay = 0.02; // 20ms delay between each string

    const sortedNotes = setup.sort((a, b) => {
        if (strumDirection === 'up') {
            return b.string - a.string;
        } else {
            return a.string - b.string;
        }
    });

    sortedNotes.forEach((note, index) => {
        if (!note.isRest) {
            const frequency = calculateFrequency(note.string, note.fret);
            const noteStartTime = currentTime + (index * strumDelay);
            playSoundFrequency(frequency, note.duration, note, noteStartTime);
        }
    });

    selectedNotes = setup;
    updateFretboardUI();
    updateAllTooltips();
}


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
    isUpstrum = true;
    playSetup(selectedNotes, audioContext.currentTime);
    document.getElementById('indicator').innerText = 'Playing Ascending Strum...';

    // Pause and then play descending strum
    const totalDuration = selectedNotes.length * 200;
    setTimeout(() => {
        isUpstrum = false;
        playSetup(selectedNotes, audioContext.currentTime);
        document.getElementById('indicator').innerText = 'Playing Descending Strum...';
    }, totalDuration + 500);

    // Show feedback options after both strums are played
    setTimeout(() => {
        document.getElementById('indicator').innerText = '';
        document.getElementById('feedback').style.display = 'block';
    }, totalDuration * 2 + 1000);
}

// Update event listeners for feedback buttons
document.getElementById('prefer-up').addEventListener('click', () => recordFeedback('up'));
document.getElementById('prefer-down').addEventListener('click', () => recordFeedback('down'));

function recordFeedback(strumType) {
    console.log(`User preferred: ${strumType} Strum`);
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('indicator').innerText = `You preferred: ${strumType} Strum`;
    isUpstrum = strumType === 'Ascending';
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

// function makeDistortionCurve(amount) {
//     const k = typeof amount === 'number' ? amount : 50;
//     const n_samples = 44100;
//     const curve = new Float32Array(n_samples);
//     const deg = Math.PI / 180;

//     for (let i = 0; i < n_samples; ++i) {
//         const x = i * 2 / n_samples - 1;
//         curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
//     }
//     return curve;
// }
document.getElementById('installPluginBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('pluginFile');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const pluginCode = e.target.result;
            const pluginName = file.name.replace('.js', '');
            installPlugin(pluginName, pluginCode);
        };
        reader.readAsText(file);
    }
});
function installPlugin(pluginName, pluginCode) {
    try {
        const plugin = new Function('return ' + pluginCode)();
        if (typeof plugin === 'object' && typeof plugin.init === 'function') {
            pluginRegistry[pluginName] = plugin;
            plugin.init();
            console.log(`Plugin ${pluginName} installed successfully.`);
        } else {
            console.error(`Invalid plugin structure for ${pluginName}.`);
        }
    } catch (error) {
        console.error(`Error installing plugin ${pluginName}:`, error);
    }
}

function calculateFrequency(string, fret) {
    if (!isFinite(string) || !isFinite(fret)) {
        console.warn('Invalid string or fret value');
        return 440; // Default to A4
    }
    const OPEN_STRING_FREQUENCIES = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41];
    const baseFrequency = OPEN_STRING_FREQUENCIES[string] || 440;
    return baseFrequency * Math.pow(2, fret / 12);
}

function updateFretboardUI() {
    const fretElements = document.querySelectorAll('.fret');
    fretElements.forEach(fretElement => {
        fretElement.classList.remove('selected');
        removeTooltip(fretElement);
    });

    selectedNotes.forEach(note => {
        const fretElement = document.querySelector(`.fret[data-string="${note.string}"][data-fret="${note.fret}"]`);
        if (fretElement) {
            fretElement.classList.add('selected');
            addTooltip(fretElement);
        }
    });

    updateAllTooltips();
}


function playSetup(setup) {
    const currentTime = audioContext.currentTime;

    setup.forEach(note => {
        if (!note.isRest) {
            const frequency = calculateFrequency(note.string, note.fret);
            playSoundFrequency(frequency, note.duration, note, currentTime);
        }
    });

    // Update UI elements
    selectedNotes = setup;
    updateFretboardUI();
    updateAllTooltips();
}
function playSoundFrequency(frequency, duration, note, startTime) {
    const safeFrequency = isFinite(frequency) ? frequency : 440;
    const safeStartTime = isFinite(startTime) ? startTime : audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(safeFrequency, safeStartTime);
    const safeVolume = isFinite(volume) ? volume : 0.5; // Default to 50% volume if invalid
    gainNode.gain.setValueAtTime(safeVolume, safeStartTime);

    const durationInSeconds = calculateDurationInSeconds(duration);
    const safeDurationInSeconds = isFinite(durationInSeconds) ? durationInSeconds : 0.25;
    const endTime = safeStartTime + safeDurationInSeconds;

    const safeEndTime = isFinite(endTime) ? endTime : 0.25;
    gainNode.gain.linearRampToValueAtTime(0, safeEndTime);

    // Apply plugin effects
    let currentNode = oscillator;
    Object.values(pluginRegistry).forEach(plugin => {
        if (typeof plugin.process === 'function') {
            const processedNode = plugin.process(audioContext, currentNode, note);
            if (processedNode && processedNode instanceof AudioNode) {
                currentNode.connect(processedNode);
                currentNode = processedNode;
            }
        }
    });
    // Ensure final connection to gain node
    if (currentNode.numberOfOutputs > 0) {
        currentNode.connect(gainNode);
    }
    gainNode.connect(audioContext.destination);

    oscillator.start(safeStartTime);
    oscillator.stop(safeEndTime);

    console.log(`Playing note: frequency=${safeFrequency}, duration=${safeDurationInSeconds}, startTime=${safeStartTime}, endTime=${safeEndTime}`);
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

function updateDistortion(e) {
    const distortionAmount = e.target.value;
    document.getElementById('distortion-value').innerText = distortionAmount;
    distortionNode.curve = makeDistortionCurve(distortionAmount);
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
