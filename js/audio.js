var CONFIG = require('./config');

var Audio = {
  _sfxVolume: 0.8,
  _bgmVolume: 0.5,
  _muted: false,
  _bgmPlaying: false,
  _bgmAudio: null,
  _sounds: {},
  _initialized: false,

  init: function() {
    if (this._initialized) return;
    this._initialized = true;
    this._sfxVolume = 0.8;
    this._bgmVolume = 0.5;
    this._loadSounds();
    this._initBGM();
  },

  _loadSounds: function() {
    var soundFiles = {
      shoot: '/audio/shoot.mp3',
      explosion: '/audio/explosion.wav',
      bigExplosion: '/audio/big_explosion.wav',
      powerup: '/audio/powerup.wav',
      hit: '/audio/hit.wav',
      steelHit: '/audio/steel_hit.wav',
      brickHit: '/audio/brick_hit.wav',
      spawn: '/audio/spawn.wav',
      move: '/audio/move.mp3',
      pause: '/audio/pause.mp3',
      enemyBoom: '/audio/enemy_boom.mp3',
      playerBoom: '/audio/player_boom.mp3',
      gameOver: '/audio/game_over.mp3',
      moreLife: '/audio/more_life.mp3'
    };

    for (var name in soundFiles) {
      try {
        var ctx = wx.createInnerAudioContext();
        ctx.src = soundFiles[name];
        ctx.volume = this._sfxVolume;
        this._sounds[name] = ctx;
      } catch (e) {
        console.warn('Failed to load sound:', name, e);
      }
    }
  },

  _initBGM: function() {
    try {
      this._bgmAudio = wx.createInnerAudioContext();
      this._bgmAudio.src = '/audio/start_background.mp3';
      this._bgmAudio.volume = this._bgmVolume;
      this._bgmAudio.loop = false;
    } catch (e) {
      console.warn('Failed to init BGM:', e);
    }
  },

  _playSound: function(name, volumeMultiplier) {
    if (this._muted) return;

    try {
      var sound = this._sounds[name];
      if (!sound) return;

      sound.stop();
      sound.volume = (volumeMultiplier || 1) * this._sfxVolume;
      sound.play();
    } catch (e) {
      console.warn('Error playing sound:', name, e);
    }
  },

  playShoot: function() {
    this._playSound('shoot', 1.0);
  },

  playExplosion: function() {
    this._playSound('explosion', 0.4);
  },

  playBigExplosion: function() {
    this._playSound('bigExplosion', 0.6);
  },

  playPowerup: function() {
    this._playSound('powerup', 1.0);
  },

  playHit: function() {
    this._playSound('hit', 1.0);
  },

  playSteelHit: function() {
    this._playSound('steelHit', 0.9);
  },

  playBrickHit: function() {
    this._playSound('brickHit', 0.9);
  },

  playSpawn: function() {
    this._playSound('spawn', 0.9);
  },

  playMove: function() {
    this._playSound('move', 1.0);
  },

  playPause: function() {
    this._playSound('pause', 1.0);
  },

  playEnemyBoom: function() {
    this._playSound('enemyBoom', 1.0);
  },

  playPlayerBoom: function() {
    this._playSound('playerBoom', 1.0);
  },

  playGameOver: function() {
    this._playSound('gameOver', 1.0);
  },

  playMoreLife: function() {
    this._playSound('moreLife', 1.0);
  },

  playLevelComplete: function() {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
      (function(idx) {
        setTimeout(function() {
          Audio._playTone(notes[idx], 150, 'square', 0.5);
        }.bind(this), idx * 150);
      })(i);
    }
  },

  _playTone: function(frequency, duration, type, vol) {
    if (this._muted || frequency <= 0) return;
    try {
      var ctx = wx.createInnerAudioContext();
      var sampleRate = 8000;
      var numSamples = Math.floor(sampleRate * duration / 1000);
      numSamples = Math.max(numSamples, 1);
      var buffer = new ArrayBuffer(numSamples);
      var data = new Uint8Array(buffer);
      var volume = vol * 0.3;

      for (var i = 0; i < numSamples; i++) {
        var t = i / sampleRate;
        var envelope = 1.0;
        if (i < numSamples * 0.1) envelope = i / (numSamples * 0.1);
        if (i > numSamples * 0.7) envelope = (numSamples - i) / (numSamples * 0.3);
        envelope = Math.max(0, Math.min(1, envelope));

        var sample = 0;
        var phase = t * frequency * 2 * Math.PI;
        if (type === 'square') {
          sample = Math.sin(phase) > 0 ? 1 : -1;
        } else if (type === 'sawtooth') {
          sample = 2 * ((t * frequency) % 1) - 1;
        } else if (type === 'triangle') {
          sample = 2 * Math.abs(2 * ((t * frequency) % 1) - 1) - 1;
        } else {
          sample = Math.sin(phase);
        }

        data[i] = Math.floor((sample * envelope * volume + 1) * 127.5);
      }

      var base64 = this._arrayBufferToBase64(buffer);
      var wavBase64 = this._createWavBase64(base64, numSamples, sampleRate, 1, 8);
      if (!wavBase64) return;
      
      var tempFilePath = wx.env.USER_DATA_PATH + '/temp_sound_' + Date.now() + '.wav';
      var fileManager = wx.getFileSystemManager();
      var arrayBuffer = this._base64ToArrayBuffer(wavBase64);
      fileManager.writeFileSync(tempFilePath, arrayBuffer, 'binary');
      
      ctx.src = tempFilePath;
      ctx.volume = Math.min(1, volume * 2);
      ctx.play();
      ctx.onEnded(function() {
        ctx.destroy();
        try {
          fileManager.unlinkSync(tempFilePath);
        } catch(e) {}
      });
    } catch (e) {}
  },

  startBGM: function() {
    if (this._bgmPlaying || !this._bgmAudio) return;
    this._bgmPlaying = true;
    try {
      this._bgmAudio.volume = this._bgmVolume;
      this._bgmAudio.play();
    } catch (e) {
      console.warn('Error playing BGM:', e);
    }
  },

  stopBGM: function() {
    this._bgmPlaying = false;
    if (this._bgmAudio) {
      try {
        this._bgmAudio.pause();
        this._bgmAudio.seek(0);
      } catch (e) {}
    }
  },

  setSFXVolume: function(vol) {
    this._sfxVolume = Math.max(0, Math.min(1, vol));
    for (var name in this._sounds) {
      if (this._sounds[name]) {
        this._sounds[name].volume = this._sfxVolume;
      }
    }
  },

  setBGMVolume: function(vol) {
    this._bgmVolume = Math.max(0, Math.min(1, vol));
    if (this._bgmAudio) {
      this._bgmAudio.volume = this._bgmVolume;
    }
  },

  setMuted: function(muted) {
    this._muted = muted;
    if (muted) {
      this.stopBGM();
    }
  },

  isMuted: function() {
    return this._muted;
  },

  _createWavBase64: function(pcmBase64, pcmLength, sampleRate, numChannels, bitsPerSample) {
    if (!pcmBase64 || pcmBase64.length === 0) return null;
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
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    try {
      return btoa(binary);
    } catch (e) {
      return null;
    }
  },

  _base64ToArrayBuffer: function(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
};

module.exports = Audio;
