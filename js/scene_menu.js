var CONFIG = require('./config');
var Utils = require('./utils');
var Storage = require('./storage');
var Audio = require('./audio');

function MenuScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;
  this.selectedOption = 0;
  this.options = ['1 PLAYER', '2 PLAYERS'];
  this.blinkTimer = 0;
  this.blinkOn = true;
  this.titleY = 80;
  this.titleTargetY = 60;
  this.animTimer = 0;
  this.inputCooldown = 0;
  this._boundTouchHandler = null;
  this.settingsBtn = { x: 20, y: 20, width: 60, height: 30 };
}

MenuScene.prototype.enter = function() {
  this.selectedOption = 0;
  this.blinkTimer = 0;
  this.titleY = 80;
  this.inputCooldown = 0;
  Audio.init();
};

MenuScene.prototype.exit = function() {
};

MenuScene.prototype.handleTouchStart = function(e) {
  if (this.inputCooldown > 0) return;

  var touches = e.touches || [];
  if (touches.length === 0) return;
  var touch = touches[0];

  var tx = touch.clientX;
  var ty = touch.clientY;
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;

  if (tx >= this.settingsBtn.x && tx <= this.settingsBtn.x + this.settingsBtn.width &&
      ty >= this.settingsBtn.y && ty <= this.settingsBtn.y + this.settingsBtn.height) {
    this.sceneManager.changeScene('settings', { prevScene: 'menu' });
    return;
  }

  var startY = centerY - 40;
  var optionHeight = 25;

  for (var i = 0; i < this.options.length; i++) {
    var optY = startY + i * optionHeight;
    if (ty >= optY - 10 && ty <= optY + optionHeight) {
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

MenuScene.prototype.update = function(dt) {
  this.animTimer += dt;
  this.blinkTimer += dt * 1000;
  if (this.blinkTimer >= 500) {
    this.blinkTimer = 0;
    this.blinkOn = !this.blinkOn;
  }

  if (this.titleY > this.titleTargetY) {
    this.titleY -= dt * 30;
    if (this.titleY < this.titleTargetY) this.titleY = this.titleTargetY;
  }

  this.inputCooldown = Math.max(0, this.inputCooldown - dt);
};

MenuScene.prototype._confirmSelection = function() {
  switch (this.selectedOption) {
    case 0:
      this.sceneManager.changeScene('stageSelect', { twoPlayer: false });
      break;
    case 1:
      this.sceneManager.changeScene('stageSelect', { twoPlayer: true });
      break;
  }
};

MenuScene.prototype.render = function() {
  this.renderer.clear();
  var ctx = this.renderer.ctx;
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;

  ctx.save();
  
  ctx.fillStyle = '#444444';
  ctx.fillRect(this.settingsBtn.x, this.settingsBtn.y, this.settingsBtn.width, this.settingsBtn.height);
  ctx.strokeStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.lineWidth = 2;
  ctx.strokeRect(this.settingsBtn.x, this.settingsBtn.y, this.settingsBtn.width, this.settingsBtn.height);
  
  ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('设置', this.settingsBtn.x + this.settingsBtn.width / 2, this.settingsBtn.y + this.settingsBtn.height / 2);

  ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (this.titleY < this.titleTargetY) this.titleY += 3;
  ctx.fillText('坦克', centerX, this.titleY);
  ctx.fillText('大战', centerX, this.titleY + 30);

  var startY = 160;
  var optionHeight = 25;
  ctx.font = '14px monospace';
  for (var i = 0; i < this.options.length; i++) {
    var y = startY + i * optionHeight;
    var isSelected = i === this.selectedOption;
    if (isSelected && this.blinkOn) {
      ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
      ctx.fillText('>', centerX - 70, y);
    }
    ctx.fillStyle = isSelected ? CONFIG.COLOR.PLAYER1_BODY : CONFIG.COLOR.HUD_TEXT;
    ctx.fillText(this.options[i], centerX, y);
  }

  ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
  ctx.font = '10px monospace';
  ctx.fillText('最高分: ' + Utils.formatScore(Storage.getHighScore()), centerX, 230);

  ctx.fillStyle = '#7C7C7C';
  ctx.font = '8px monospace';
  ctx.fillText('触摸选择', centerX, 250);
  ctx.restore();
};

module.exports = MenuScene;
