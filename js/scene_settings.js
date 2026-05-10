var CONFIG = require('./config');
var Audio = require('./audio');

function SettingsScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;
  this.selectedOption = 0;
  this.options = ['背景音乐', '返回'];
  this.blinkTimer = 0;
  this.blinkOn = true;
  this.inputCooldown = 0;
  this.prevScene = null;
}

SettingsScene.prototype.enter = function(data) {
  this.selectedOption = 0;
  this.blinkTimer = 0;
  this.inputCooldown = 0;
  if (data && data.prevScene) {
    this.prevScene = data.prevScene;
  }
};

SettingsScene.prototype.exit = function() {
};

SettingsScene.prototype.handleTouchStart = function(e) {
  if (this.inputCooldown > 0) return;

  var touches = e.touches || [];
  if (touches.length === 0) return;
  var touch = touches[0];

  var tx = touch.clientX;
  var ty = touch.clientY;
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;

  var startY = centerY - 20;
  var optionHeight = 30;

  for (var i = 0; i < this.options.length; i++) {
    var optY = startY + i * optionHeight;
    if (ty >= optY - 15 && ty <= optY + optionHeight) {
      this.selectedOption = i;
      this._confirmSelection();
      return;
    }
  }

  if (tx < centerX) {
    this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
  } else {
    this.selectedOption = (this.selectedOption + 1) % this.options.length;
  }
  this.inputCooldown = 0.2;
};

SettingsScene.prototype.update = function(dt) {
  this.blinkTimer += dt * 1000;
  if (this.blinkTimer >= 500) {
    this.blinkTimer = 0;
    this.blinkOn = !this.blinkOn;
  }
  this.inputCooldown = Math.max(0, this.inputCooldown - dt);
};

SettingsScene.prototype._confirmSelection = function() {
  switch (this.selectedOption) {
    case 0:
      var currentEnabled = Audio.isBGMEnabled();
      Audio.setBGMEnabled(!currentEnabled);
      break;
    case 1:
      if (this.prevScene) {
        this.sceneManager.changeScene(this.prevScene);
      } else {
        this.sceneManager.changeScene('menu');
      }
      break;
  }
};

SettingsScene.prototype.render = function() {
  this.renderer.clear();
  var ctx = this.renderer.ctx;
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;

  ctx.save();
  ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('系统设置', centerX, 80);

  var startY = centerY - 20;
  var optionHeight = 30;
  ctx.font = '16px monospace';
  
  for (var i = 0; i < this.options.length; i++) {
    var y = startY + i * optionHeight;
    var isSelected = i === this.selectedOption;
    
    if (isSelected && this.blinkOn) {
      ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
      ctx.fillText('>', centerX - 80, y);
    }
    
    if (i === 0) {
      var bgmStatus = Audio.isBGMEnabled() ? 'ON' : 'OFF';
      ctx.fillStyle = isSelected ? CONFIG.COLOR.PLAYER1_BODY : CONFIG.COLOR.HUD_TEXT;
      ctx.fillText(this.options[i] + ': ' + bgmStatus, centerX, y);
    } else {
      ctx.fillStyle = isSelected ? CONFIG.COLOR.PLAYER1_BODY : CONFIG.COLOR.HUD_TEXT;
      ctx.fillText(this.options[i], centerX, y);
    }
  }

  ctx.fillStyle = '#7C7C7C';
  ctx.font = '10px monospace';
  ctx.fillText('触摸选择', centerX, 250);
  ctx.restore();
};

module.exports = SettingsScene;