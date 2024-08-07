function generateTablature() {
    const NUM_STRINGS = 6;
    const tablatureLines = Array(NUM_STRINGS).fill().map(() => "");
    const stringNames = ["e", "B", "G", "D", "A", "E"];

    recordedSetups.forEach((setup, stepIndex) => {
        const tabStep = Array(NUM_STRINGS).fill().map(() => "---");

        setup.forEach(note => {
            if (!note.isRest) {
                const stringIndex = 5 - note.string; // Reverse the string index
                const fret = note.fret;
                tabStep[stringIndex] = fret.toString().padStart(3, "-");
            }
        });

        tabStep.forEach((tab, index) => {
            tablatureLines[index] += tab;
        });
    });

    let tablature = tablatureLines.map((line, index) => `${stringNames[index]}|${line}`).join("\n");

    return tablature;
}
function saveTablature() {
    const tablature = generateTablature();
    const blob = new Blob([tablature], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tablature.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('generateTablature').addEventListener('click', saveTablature);
