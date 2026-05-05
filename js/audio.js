var CONFIG = require('./config');

var Audio = {
  _audioContext: null,
  _sfxVolume: 0.7,
  _bgmVolume: 0.5,
  _bgmPlaying: false,
  _muted: false,
  _bgmTimer: null,
  _bgmNoteIndex: 0,

  init: function() {
    this._sfxVolume = 0.7;
    this._bgmVolume = 0.5;
  },

  _createOscillator: function(freq, duration, type, volume) {
    if (this._muted) return;
    try {
      var audioCtx = wx.createInnerAudioContext();
      return audioCtx;
    } catch (e) {
      return null;
    }
  },

  _playTone: function(frequency, duration, type, vol) {
    if (this._muted || frequency <= 0) return;
    try {
      var ctx = wx.createInnerAudioContext();
      var sampleRate = 8000;
      var numSamples = Math.floor(sampleRate * duration / 1000);
      numSamples = Math.max(numSamples, 1);
      var numChannels = 1;
      var buffer = new ArrayBuffer(numSamples * numChannels);
      var data = new Uint8Array(buffer);
      var volume = (vol || this._sfxVolume) * 0.3;

      for (var i = 0; i < numSamples; i++) {
        var t = i / sampleRate;
        var envelope = 1.0;
        if (i < numSamples * 0.1) envelope = i / (numSamples * 0.1);
        if (i > numSamples * 0.7) envelope = (numSamples - i) / (numSamples * 0.3);
        envelope = Math.max(0, Math.min(1, envelope));

        var sample = 0;
        var tp = type || 'square';
        var phase = t * frequency * 2 * Math.PI;
        if (tp === 'square') {
          sample = Math.sin(phase) > 0 ? 1 : -1;
        } else if (tp === 'sawtooth') {
          sample = 2 * ((t * frequency) % 1) - 1;
        } else if (tp === 'triangle') {
          sample = 2 * Math.abs(2 * ((t * frequency) % 1) - 1) - 1;
        } else {
          sample = Math.sin(phase);
        }

        data[i] = Math.floor((sample * envelope * volume + 1) * 127.5);
      }

      var base64 = this._arrayBufferToBase64(buffer);
      var wavBase64 = this._createWavBase64(base64, sampleRate, numChannels, 8);
      ctx.src = 'data:audio/wav;base64,' + wavBase64;
      ctx.volume = Math.min(1, volume * 2);
      ctx.play();
      ctx.onEnded(function() {
        ctx.destroy();
      });
    } catch (e) {}
  },

  _createWavBase64: function(pcmBase64, sampleRate, numChannels, bitsPerSample) {
    var pcmLength = Math.floor(pcmBase64.length * 3 / 4);
    var header = this._createWavHeader(pcmLength, sampleRate, numChannels, bitsPerSample);
    var headerBase64 = this._arrayBufferToBase64(header);
    return headerBase64 + pcmBase64;
  },

  _createWavHeader: function(dataLength, sampleRate, numChannels, bitsPerSample) {
    var byteRate = sampleRate * numChannels * bitsPerSample / 8;
    var blockAlign = numChannels * bitsPerSample / 8;
    var buffer = new ArrayBuffer(44);
    var view = new DataView(buffer);

    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this._writeString(view, 8, 'WAVE');
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
  },

  _writeString: function(view, offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  },

  _arrayBufferToBase64: function(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    var base64 = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var len = binary.length;
    for (var i = 0; i < len; i += 3) {
      var b1 = binary.charCodeAt(i);
      var b2 = i + 1 < len ? binary.charCodeAt(i + 1) : 0;
      var b3 = i + 2 < len ? binary.charCodeAt(i + 2) : 0;
      base64 += chars[b1 >> 2];
      base64 += chars[((b1 & 3) << 4) | (b2 >> 4)];
      base64 += i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
      base64 += i + 2 < len ? chars[b3 & 63] : '=';
    }
    return base64;
  },

  playShoot: function() {
    this._playTone(880, 60, 'square', this._sfxVolume * 0.5);
    setTimeout(function() {
      this._playTone(660, 40, 'square', this._sfxVolume * 0.3);
    }.bind(this), 30);
  },

  playExplosion: function() {
    this._playTone(120, 200, 'sawtooth', this._sfxVolume * 0.8);
    setTimeout(function() {
      this._playTone(80, 150, 'sawtooth', this._sfxVolume * 0.5);
    }.bind(this), 50);
  },

  playBigExplosion: function() {
    this._playTone(100, 300, 'sawtooth', this._sfxVolume);
    setTimeout(function() {
      this._playTone(60, 200, 'sawtooth', this._sfxVolume * 0.7);
    }.bind(this), 100);
    setTimeout(function() {
      this._playTone(40, 150, 'sawtooth', this._sfxVolume * 0.4);
    }.bind(this), 200);
  },

  playPowerup: function() {
    this._playTone(523, 80, 'square', this._sfxVolume * 0.5);
    setTimeout(function() {
      this._playTone(659, 80, 'square', this._sfxVolume * 0.5);
    }.bind(this), 80);
    setTimeout(function() {
      this._playTone(784, 120, 'square', this._sfxVolume * 0.5);
    }.bind(this), 160);
  },

  playHit: function() {
    this._playTone(200, 50, 'square', this._sfxVolume * 0.3);
  },

  playSteelHit: function() {
    this._playTone(400, 30, 'triangle', this._sfxVolume * 0.3);
  },

  playSpawn: function() {
    this._playTone(440, 50, 'square', this._sfxVolume * 0.3);
    setTimeout(function() {
      this._playTone(880, 50, 'square', this._sfxVolume * 0.3);
    }.bind(this), 60);
  },

  playGameOver: function() {
    var notes = [392, 349, 330, 294, 262];
    for (var i = 0; i < notes.length; i++) {
      (function(idx, note) {
        setTimeout(function() {
          this._playTone(note, 300, 'square', this._sfxVolume * 0.6);
        }.bind(this), idx * 300);
      }.bind(this))(i, notes[i]);
    }
  },

  playLevelComplete: function() {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
      (function(idx, note) {
        setTimeout(function() {
          this._playTone(note, 150, 'square', this._sfxVolume * 0.5);
        }.bind(this), idx * 150);
      }.bind(this))(i, notes[i]);
    }
  },

  _bgmNotes: [
    330, 330, 349, 392, 392, 349, 330, 294,
    262, 262, 294, 330, 330, 294, 294, 0,
    330, 330, 349, 392, 392, 349, 330, 294,
    262, 262, 294, 330, 294, 262, 262, 0
  ],

  startBGM: function() {
    if (this._bgmPlaying) return;
    this._bgmPlaying = true;
    this._bgmNoteIndex = 0;
    this._playBGMLoop();
  },

  _playBGMLoop: function() {
    if (!this._bgmPlaying) return;
    var note = this._bgmNotes[this._bgmNoteIndex % this._bgmNotes.length];
    if (note > 0) {
      this._playTone(note, 180, 'square', this._bgmVolume * 0.2);
    }
    this._bgmNoteIndex++;
    this._bgmTimer = setTimeout(function() {
      this._playBGMLoop();
    }.bind(this), 200);
  },

  stopBGM: function() {
    this._bgmPlaying = false;
    if (this._bgmTimer) {
      clearTimeout(this._bgmTimer);
      this._bgmTimer = null;
    }
  },

  setSFXVolume: function(vol) {
    this._sfxVolume = Math.max(0, Math.min(1, vol));
  },

  setBGMVolume: function(vol) {
    this._bgmVolume = Math.max(0, Math.min(1, vol));
  },

  setMuted: function(muted) {
    this._muted = muted;
    if (muted) {
      this.stopBGM();
    }
  },

  isMuted: function() {
    return this._muted;
  }
};

module.exports = Audio;
