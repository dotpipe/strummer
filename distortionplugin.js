(function() {
    let distortionAmount = 0;

    return {
        init: function() {
            console.log("Distortion plugin initialized");
            // Create UI elements for controlling distortion
            const container = document.getElementById('plugins');
            const distortion = document.createElement('div');
            distortion.innerHTML = `
                <label for="distortion-amount">Distortion: </label>
                <input type="range" id="distortion-amount" min="0" max="100" value="0">
                <span id="distortion-value">0</span>
            `;
            container.appendChild(distortion);

            // Add event listener for distortion control
            document.getElementById('distortion-amount').addEventListener('input', (e) => {
                distortionAmount = parseInt(e.target.value);
                document.getElementById('distortion-value').textContent = distortionAmount;
            });
        },
        process: function(audioContext, sourceNode) {
            const distortionNode = audioContext.createWaveShaper();
            distortionNode.curve = this.makeDistortionCurve(distortionAmount);
            sourceNode.connect(distortionNode);
            return distortionNode;
        },
        makeDistortionCurve: function(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 1256000;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            return curve;
        },
        getSettings: function() {
            return { distortionAmount: distortionAmount };
        },
        applySettings: function(settings) {
            distortionAmount = settings.distortionAmount;
            document.getElementById('distortion-amount').value = distortionAmount;
            document.getElementById('distortion-value').textContent = distortionAmount;
        },
        isEnabled: function() {
            return this.enabled !== false; // Default to true if not explicitly set
        },
        setEnabled: function(status) {
            this.enabled = status;
        }
    };
})();
