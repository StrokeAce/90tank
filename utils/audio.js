class AudioManager {
  constructor() {
    this.isMuted = true;
    this.volume = 0.5;
    this.isBgMusicPlaying = false;
    this.bgTimer = null;
    this.fs = null;
  }

  init() {
    try {
      this.fs = wx.getFileSystemManager();
    } catch (e) {
      console.log('FileSystemManager not available');
    }
  }

  playTone(frequency, duration, vol) {
    if (this.isMuted || !this.fs) return;

    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-3 * t / duration);
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
      view.setInt16(44 + i * 2, sample * 32767 * 0.8, true);
    }

    const filePath = `${wx.env.USER_DATA_PATH}/temp_tone_${Date.now()}.wav`;

    try {
      this.fs.writeFile({
        filePath: filePath,
        data: buffer,
        encoding: 'binary',
        success: () => {
          const audioContext = wx.createInnerAudioContext();
          audioContext.src = filePath;
          audioContext.volume = vol || this.volume;
          audioContext.play();

          audioContext.onEnded(() => {
            audioContext.destroy();
            try {
              this.fs.unlinkSync(filePath);
            } catch (e) {}
          });

          audioContext.onError(() => {
            audioContext.destroy();
            try {
              this.fs.unlinkSync(filePath);
            } catch (e) {}
          });
        },
        fail: () => {}
      });
    } catch (e) {}
  }

  playShoot() {
    if (this.isMuted) return;
    this.playTone(600, 0.05, 0.3);
    setTimeout(() => this.playTone(400, 0.05, 0.2), 30);
  }

  playExplosion() {
    if (this.isMuted) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(80 + Math.random() * 40, 0.1, 0.4);
      }, i * 30);
    }
    this.playTone(50, 0.3, 0.5);
  }

  playEnemySpawn() {
    if (this.isMuted) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(200 + i * 100, 0.08, 0.2);
      }, i * 50);
    }
  }

  playPlayerDie() {
    if (this.isMuted) return;
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.playTone(300 - i * 30, 0.1, 0.3);
      }, i * 60);
    }
  }

  playVictory() {
    if (this.isMuted) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 0.3);
      }, i * 150);
    });
    setTimeout(() => {
      this.playTone(1047, 0.4, 0.4);
    }, 600);
  }

  playDefeat() {
    if (this.isMuted) return;
    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 0.4);
      }, i * 200);
    });
  }

  playBulletHit() {
    if (this.isMuted) return;
    this.playTone(800, 0.02, 0.15);
  }

  playBackgroundMusic() {
    if (this.isMuted || this.isBgMusicPlaying) return;
    this.isBgMusicPlaying = true;
    this.startBgMusicLoop();
  }

  startBgMusicLoop() {
    if (!this.isBgMusicPlaying || this.isMuted) return;

    const bpm = 120;
    const beatDuration = 60 / bpm;

    const melody = [
      { freq: 262, duration: 0.25 },
      { freq: 294, duration: 0.25 },
      { freq: 330, duration: 0.25 },
      { freq: 262, duration: 0.25 },
      { freq: 330, duration: 0.25 },
      { freq: 392, duration: 0.25 },
      { freq: 330, duration: 0.25 },
      { freq: 262, duration: 0.25 },
    ];

    let time = 0;
    melody.forEach(note => {
      setTimeout(() => {
        if (this.isBgMusicPlaying && !this.isMuted) {
          this.playTone(note.freq, note.duration * beatDuration * 0.8, 0.15);
        }
      }, time * 1000);
      time += note.duration * beatDuration;
    });

    this.bgTimer = setTimeout(() => {
      if (this.isBgMusicPlaying) {
        this.startBgMusicLoop();
      }
    }, time * 1000);
  }

  stopBackgroundMusic() {
    this.isBgMusicPlaying = false;
    if (this.bgTimer) {
      clearTimeout(this.bgTimer);
      this.bgTimer = null;
    }
  }

  pauseBackgroundMusic() {
    this.stopBackgroundMusic();
  }

  resumeBackgroundMusic() {
    if (!this.isMuted) {
      this.isBgMusicPlaying = true;
      this.startBgMusicLoop();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else {
      this.resumeBackgroundMusic();
    }
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopBackgroundMusic();
    }
  }

  destroy() {
    this.stopBackgroundMusic();
  }
}

module.exports = AudioManager;