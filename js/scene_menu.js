var CONFIG = require('./config');
var Utils = require('./utils');
var Storage = require('./storage');
var Audio = require('./audio');

function MenuScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;
  this.selectedOption = 0;
  this.options = ['1 PLAYER', '2 PLAYERS', 'CONSTRUCTION'];
  this.blinkTimer = 0;
  this.blinkOn = true;
  this.titleY = 80;
  this.titleTargetY = 60;
  this.animTimer = 0;
  this.inputCooldown = 0;
  this._boundTouchHandler = null;
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
  
  var screenInfo = this.renderer.getScreenInfo();
  var gameX = (touch.clientX - screenInfo.offsetX) / screenInfo.scale;
  var gameY = (touch.clientY - screenInfo.offsetY) / screenInfo.scale;

  var startY = 160;
  var optionHeight = 25;

  for (var i = 0; i < this.options.length; i++) {
    var optY = startY + i * optionHeight;
    if (gameY >= optY - 10 && gameY <= optY + optionHeight) {
      this.selectedOption = i;
      this._confirmSelection();
      return;
    }
  }

  if (gameX < this.renderer.gameWidth / 2) {
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
    case 2:
      break;
  }
};

MenuScene.prototype.render = function() {
  this.renderer.clear();

  this.renderer.renderCenteredText('BATTLE', this.titleY, {
    size: 28,
    bold: true,
    color: CONFIG.COLOR.PLAYER1_BODY,
    shadow: true
  });

  this.renderer.renderCenteredText('CITY', this.titleY + 30, {
    size: 28,
    bold: true,
    color: CONFIG.COLOR.PLAYER1_BODY,
    shadow: true
  });

  this.renderer.renderCenteredText('90', this.titleY + 55, {
    size: 16,
    color: CONFIG.COLOR.HUD_TEXT,
    shadow: true
  });

  var startY = 160;
  var optionHeight = 25;

  for (var i = 0; i < this.options.length; i++) {
    var y = startY + i * optionHeight;
    var isSelected = i === this.selectedOption;

    if (isSelected && this.blinkOn) {
      this.renderer.renderText('>', this.renderer.gameWidth / 2 - 70, y, {
        size: 14,
        bold: true,
        color: CONFIG.COLOR.PLAYER1_BODY
      });
    }

    this.renderer.renderCenteredText(this.options[i], y, {
      size: 14,
      bold: isSelected,
      color: isSelected ? CONFIG.COLOR.PLAYER1_BODY : CONFIG.COLOR.HUD_TEXT,
      shadow: true
    });
  }

  this.renderer.renderCenteredText('HIGH SCORE: ' + Utils.formatScore(Storage.getHighScore()), 280, {
    size: 10,
    color: CONFIG.COLOR.HUD_TEXT
  });

  this.renderer.renderCenteredText('TOUCH TO SELECT', 300, {
    size: 8,
    color: '#7C7C7C'
  });
};

module.exports = MenuScene;
