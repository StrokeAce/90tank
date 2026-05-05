const app = getApp();

Page({
  data: {
    isSinglePlayer: true,
    difficulty: 'medium',
    currentLevel: 1,
    maxUnlockedLevel: 3
  },

  onLoad: function() {
    const isSinglePlayer = app.globalData.isSinglePlayer;
    const difficulty = app.globalData.difficulty;
    this.setData({
      isSinglePlayer: isSinglePlayer,
      difficulty: difficulty
    });
  },

  setSinglePlayer: function() {
    this.setData({ isSinglePlayer: true });
    app.globalData.isSinglePlayer = true;
  },

  setTwoPlayers: function() {
    this.setData({ isSinglePlayer: false });
    app.globalData.isSinglePlayer = false;
  },

  setDifficulty: function(e) {
    const diff = e.currentTarget.dataset.diff;
    this.setData({ difficulty: diff });
    app.globalData.difficulty = diff;
  },

  getDifficultyText: function(diff) {
    const map = { easy: '简单', medium: '中等', hard: '发狂' };
    return map[diff] || '中等';
  },

  selectLevel: function(e) {
    const level = e.currentTarget.dataset.level;
    if (level > this.data.maxUnlockedLevel) {
      wx.showToast({
        title: '请先通过前一关',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    app.globalData.currentLevel = level;
    wx.navigateTo({
      url: '/pages/game/game'
    });
  },

  goBack: function() {
    wx.navigateBack();
  }
});