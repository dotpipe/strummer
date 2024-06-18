// bendPlugin.js
class BendPlugin {
    constructor(config) {
      this.delay = config.delay || 0;
      this.semitoneBend = config.semitoneBend || 1;
      this.vibrato = config.vibrato || false;
      this.vibratoSpeed = config.vibratoSpeed || 5; // Speed of vibrato in Hz
      this.vibratoDepth = config.vibratoDepth || 0.5; // Depth of vibrato in semitones
    }
  
    applyBend(noteElement) {
      const note = noteElement.dataset.note; // Assume note is stored in a data attribute
      console.log(`Applying bend to note: ${note}`);
      setTimeout(() => {
        this.bend(noteElement);
        if (this.vibrato) {
          this.applyVibrato(noteElement);
        }
      }, this.delay);
    }
  
    bend(noteElement) {
      const note = noteElement.dataset.note;
      console.log(`Bending note ${note} by ${this.semitoneBend} semitones.`);
      // Apply the actual bend logic here, e.g., changing the note pitch
      noteElement.style.transform = `translateY(${this.semitoneBend * -10}px)`; // Example visual representation of bend
      noteElement.dataset.bent = true; // Mark the note as bent
    }
  
    applyVibrato(noteElement) {
      const note = noteElement.dataset.note;
      console.log(`Applying vibrato to note: ${note}`);
      
      const vibratoInterval = 1000 / this.vibratoSpeed / 2; // Interval for vibrato in milliseconds
  
      let vibratoDirection = 1; // 1 for up, -1 for down
      const vibrato = () => {
        const currentBend = parseFloat(noteElement.dataset.bend || 0);
        const newBend = currentBend + vibratoDirection * this.vibratoDepth;
        
        noteElement.dataset.bend = newBend.toFixed(2);
        noteElement.style.transform = `translateY(${newBend * -10}px)`; // Example visual representation of vibrato
        console.log(`Vibrato note ${note} to ${newBend.toFixed(2)} semitones.`);
  
        vibratoDirection *= -1; // Reverse direction
      };
  
      noteElement.vibratoInterval = setInterval(vibrato, vibratoInterval);
    }
  
    stopVibrato(noteElement) {
      clearInterval(noteElement.vibratoInterval);
      noteElement.dataset.bend = 0; // Reset bend
      noteElement.style.transform = 'translateY(0)'; // Reset visual representation
      console.log(`Stopped vibrato for note: ${noteElement.dataset.note}`);
    }
  
    // Method to create controls for this plugin
    createControls() {
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'plugin-controls';
  
      const delayLabel = document.createElement('label');
      delayLabel.textContent = 'Delay (ms): ';
      const delayInput = document.createElement('input');
      delayInput.type = 'number';
      delayInput.value = this.delay;
      delayInput.onchange = (e) => {
        this.delay = parseInt(e.target.value);
        setCookie('bendPlugin_delay', this.delay, 7);
      };
  
      const semitoneBendLabel = document.createElement('label');
      semitoneBendLabel.textContent = 'Semitone Bend: ';
      const semitoneBendInput = document.createElement('input');
      semitoneBendInput.type = 'number';
      semitoneBendInput.value = this.semitoneBend;
      semitoneBendInput.onchange = (e) => {
        this.semitoneBend = parseInt(e.target.value);
        setCookie('bendPlugin_semitoneBend', this.semitoneBend, 7);
      };
  
      const vibratoLabel = document.createElement('label');
      vibratoLabel.textContent = 'Enable Vibrato: ';
      const vibratoInput = document.createElement('input');
      vibratoInput.type = 'checkbox';
      vibratoInput.checked = this.vibrato;
      vibratoInput.onchange = (e) => {
        this.vibrato = e.target.checked;
        setCookie('bendPlugin_vibrato', this.vibrato, 7);
      };
  
      const vibratoSpeedLabel = document.createElement('label');
      vibratoSpeedLabel.textContent = 'Vibrato Speed (Hz): ';
      const vibratoSpeedInput = document.createElement('input');
      vibratoSpeedInput.type = 'number';
      vibratoSpeedInput.value = this.vibratoSpeed;
      vibratoSpeedInput.onchange = (e) => {
        this.vibratoSpeed = parseFloat(e.target.value);
        setCookie('bendPlugin_vibratoSpeed', this.vibratoSpeed, 7);
      };
  
      const vibratoDepthLabel = document.createElement('label');
      vibratoDepthLabel.textContent = 'Vibrato Depth (semitones): ';
      const vibratoDepthInput = document.createElement('input');
      vibratoDepthInput.type = 'number';
      vibratoDepthInput.value = this.vibratoDepth;
      vibratoDepthInput.onchange = (e) => {
        this.vibratoDepth = parseFloat(e.target.value);
        setCookie('bendPlugin_vibratoDepth', this.vibratoDepth, 7);
      };
  
      controlsDiv.appendChild(delayLabel);
      controlsDiv.appendChild(delayInput);
      controlsDiv.appendChild(document.createElement('br'));
      controlsDiv.appendChild(semitoneBendLabel);
      controlsDiv.appendChild(semitoneBendInput);
      controlsDiv.appendChild(document.createElement('br'));
      controlsDiv.appendChild(vibratoLabel);
      controlsDiv.appendChild(vibratoInput);
      controlsDiv.appendChild(document.createElement('br'));
      controlsDiv.appendChild(vibratoSpeedLabel);
      controlsDiv.appendChild(vibratoSpeedInput);
      controlsDiv.appendChild(document.createElement('br'));
      controlsDiv.appendChild(vibratoDepthLabel);
      controlsDiv.appendChild(vibratoDepthInput);
  
      return controlsDiv;
    }
  }
  
  // Utility to set and get cookies
  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }
  
  function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(cname) == 0) {
        return c.substring(cname.length, c.length);
      }
    }
    return "";
  }
  
  // Function to initialize the plugin
  function initializeBendPlugin() {
    const delay = getCookie('bendPlugin_delay') || 0;
    const semitoneBend = getCookie('bendPlugin_semitoneBend') || 1;
    const vibrato = getCookie('bendPlugin_vibrato') === 'true';
    const vibratoSpeed = getCookie('bendPlugin_vibratoSpeed') || 5;
    const vibratoDepth = getCookie('bendPlugin_vibratoDepth') || 0.5;
  
    const config = {
      delay: parseInt(delay),
      semitoneBend: parseInt(semitoneBend),
      vibrato: vibrato,
      vibratoSpeed: parseFloat(vibratoSpeed),
      vibratoDepth: parseFloat(vibratoDepth)
    };
  
    const bendPlugin = new BendPlugin(config);
    window.bendPlugin = bendPlugin; // Make it globally accessible
  
    // Add event listeners to fret/grid elements
    document.querySelectorAll('.fret').forEach(fret => {
      fret.addEventListener('click', (event) => {
        const target = event.currentTarget;
        bendPlugin.applyBend(target);
        target.addEventListener('mouseleave', () => {
          bendPlugin.stopVibrato(target);
        }, { once: true });
      });
    });
  
    // Append plugin controls to the plugins div
    const pluginsDiv = document.getElementById('plugins');
    if (pluginsDiv) {
      pluginsDiv.appendChild(bendPlugin.createControls());
    }
  }

  initializeBendPlugin();