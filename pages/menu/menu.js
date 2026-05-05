const app = getApp();

Page({
  data: {
    showHelpModal: false
  },

  onLoad: function() {
  },

  startGame: function() {
    wx.navigateTo({
      url: '/pages/levels/levels'
    });
  },

  showHelp: function() {
    this.setData({ showHelpModal: true });
  },

  hideHelp: function() {
    this.setData({ showHelpModal: false });
  },

  stopProp: function() {}
});