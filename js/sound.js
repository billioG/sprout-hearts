// ===== Sistema de sonido 8-bit (Web Audio API) =====
// No necesita archivos externos – genera sonidos retro proceduralmente

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentMusic = null;
    this.musicInterval = null;
    this.initialized = false;
  }

  // Inicializar tras el primer toque del usuario (política de autoplay)
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.35;
      this.sfxGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.ctx.destination);

      this.initialized = true;
      console.log('🔊 Sound system ready (8-bit)');
    } catch (e) {
      console.warn('Audio no disponible:', e);
      this.enabled = false;
    }
  }

  // ===== Generadores de tonos =====
  _tone(freq, duration, type = 'square', volume = 0.3, when = 0) {
    if (!this.initialized || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  _noise(duration, volume = 0.15) {
    if (!this.initialized || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    noise.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  // ===== Efectos de sonido =====
  play(name) {
    if (!this.initialized) this.init();
    if (!this.enabled) return;

    switch (name) {
      case 'click':
        this._tone(800, 0.06, 'square', 0.2);
        break;

      case 'select':
        this._tone(523, 0.08, 'square', 0.25);
        this._tone(659, 0.08, 'square', 0.2, 0.07);
        break;

      case 'heart':
        // Melodía corta de corazón
        this._tone(523, 0.1, 'square', 0.3);      // C5
        this._tone(659, 0.1, 'square', 0.28, 0.1); // E5
        this._tone(784, 0.15, 'square', 0.25, 0.2); // G5
        break;

      case 'send':
        this._tone(440, 0.08, 'square', 0.25);
        this._tone(554, 0.08, 'square', 0.25, 0.08);
        this._tone(659, 0.12, 'square', 0.3, 0.16);
        this._tone(880, 0.2, 'square', 0.2, 0.28);
        break;

      case 'walk':
        // Paso suave (muy corto)
        this._tone(180 + Math.random() * 40, 0.04, 'triangle', 0.08);
        break;

      case 'levelup':
        // Fanfare
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => {
          this._tone(n, 0.15, 'square', 0.3, i * 0.12);
        });
        this._tone(1319, 0.3, 'square', 0.25, 0.5);
        break;

      case 'error':
        this._tone(200, 0.15, 'sawtooth', 0.2);
        this._tone(150, 0.2, 'sawtooth', 0.15, 0.12);
        break;

      case 'partner':
        // Sonido de pareja conectada
        this._tone(392, 0.1, 'square', 0.25);
        this._tone(523, 0.1, 'square', 0.25, 0.1);
        this._tone(659, 0.2, 'square', 0.3, 0.2);
        break;

      case 'ui':
        this._tone(660, 0.05, 'square', 0.15);
        break;

      default:
        this._tone(440, 0.1, 'square', 0.2);
    }
  }

  // ===== Música de fondo chiptune simple =====
  startMusic() {
    if (!this.initialized || !this.enabled) return;
    this.stopMusic();

    // Melodía simple de tipo RPG (loop)
    const melody = [
      { f: 262, d: 0.25 }, // C4
      { f: 294, d: 0.25 }, // D4
      { f: 330, d: 0.25 }, // E4
      { f: 349, d: 0.25 }, // F4
      { f: 392, d: 0.35 }, // G4
      { f: 349, d: 0.2 },
      { f: 330, d: 0.25 },
      { f: 294, d: 0.25 },
      { f: 262, d: 0.4 },
      { f: 0,   d: 0.15 }, // silencio
      { f: 330, d: 0.25 },
      { f: 392, d: 0.25 },
      { f: 440, d: 0.3 },
      { f: 392, d: 0.25 },
      { f: 349, d: 0.4 },
      { f: 0,   d: 0.2 }
    ];

    let idx = 0;
    const playNext = () => {
      if (!this.enabled || !this.musicGain) return;
      const note = melody[idx];
      if (note.f > 0) {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d * 0.9);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + note.d);
      }
      idx = (idx + 1) % melody.length;
      this.musicInterval = setTimeout(playNext, note.d * 1000);
    };
    playNext();
  }

  stopMusic() {
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopMusic();
    else if (this.initialized) this.startMusic();
    return this.enabled;
  }

  setMusicVolume(v) {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }
}

export const sound = new SoundManager();
