var Storage = {
  _prefix: 'tank90_',

  save: function(key, value) {
    try {
      wx.setStorageSync(this._prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  load: function(key, defaultValue) {
    try {
      var data = wx.getStorageSync(this._prefix + key);
      if (data === '' || data === undefined || data === null) {
        return defaultValue;
      }
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  },

  remove: function(key) {
    try {
      wx.removeStorageSync(this._prefix + key);
    } catch (e) {}
  },

  getHighScore: function() {
    return this.load('highScore', 0);
  },

  setHighScore: function(score) {
    var current = this.getHighScore();
    if (score > current) {
      this.save('highScore', score);
      return true;
    }
    return false;
  },

  getMaxStage: function() {
    return this.load('maxStage', 1);
  },

  setMaxStage: function(stage) {
    var current = this.getMaxStage();
    if (stage > current) {
      this.save('maxStage', stage);
    }
  },

  getSettings: function() {
    return this.load('settings', {
      sfxVolume: 0.7,
      bgmVolume: 0.5,
      joystickSize: 1.0,
      joystickOpacity: 0.35,
      autoFire: false,
      controls: 'dual_stick'
    });
  },

  saveSettings: function(settings) {
    this.save('settings', settings);
  },

  getBGMEnabled: function() {
    return this.load('bgmEnabled', false);
  },

  setBGMEnabled: function(enabled) {
    this.save('bgmEnabled', enabled);
  },

  getGameProgress: function() {
    return this.load('progress', {
      stage: 1,
      lives: 3,
      score: 0,
      stars: 0
    });
  },

  saveGameProgress: function(progress) {
    this.save('progress', progress);
  },

  clearProgress: function() {
    this.remove('progress');
  }
};

module.exports = Storage;
