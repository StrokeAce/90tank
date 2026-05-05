var CONFIG = require('./config');
var Utils = require('./utils');
var Storage = require('./storage');

function StageSelectScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;
  this.selectedStage = 0;
  this.maxStage = Storage.getMaxStage() - 1;
  this.twoPlayer = false;
  this.stagesPerRow = 5;
  this.blinkTimer = 0;
  this.blinkOn = true;
  this.inputCooldown = 0;
  this.totalLevels = 35;
}

StageSelectScene.prototype.enter = function(data) {
  this.twoPlayer = data ? data.twoPlayer : false;
  this.selectedStage = 0;
  this.maxStage = Math.min(Storage.getMaxStage() - 1, this.totalLevels - 1);
  this.blinkTimer = 0;
};

StageSelectScene.prototype.exit = function() {
};

StageSelectScene.prototype.handleTouchStart = function(e) {
  if (this.inputCooldown > 0) return;
  
  var touches = e.touches || [];
  if (touches.length === 0) return;
  var touch = touches[0];
  
  var screenInfo = this.renderer.getScreenInfo();
  var gameX = (touch.clientX - screenInfo.offsetX) / screenInfo.scale;
  var gameY = (touch.clientY - screenInfo.offsetY) / screenInfo.scale;

  var startX = 120;
  var startY = 80;
  var cellW = 50;
  var cellH = 50;
  var cols = this.stagesPerRow;

  for (var i = 0; i < this.totalLevels; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var cx = startX + col * cellW;
    var cy = startY + row * cellH;

    if (gameX >= cx && gameX < cx + cellW && gameY >= cy && gameY < cy + cellH) {
      if (i <= this.maxStage) {
        this.selectedStage = i;
        this._confirmSelection();
      }
      return;
    }
  }

  if (gameY > 300) {
    this._confirmSelection();
  }

  this.inputCooldown = 0.3;
};

StageSelectScene.prototype.update = function(dt) {
  this.blinkTimer += dt * 1000;
  if (this.blinkTimer >= 400) {
    this.blinkTimer = 0;
    this.blinkOn = !this.blinkOn;
  }
  this.inputCooldown = Math.max(0, this.inputCooldown - dt);
};

StageSelectScene.prototype._confirmSelection = function() {
  this.sceneManager.changeScene('game', {
    stage: this.selectedStage,
    twoPlayer: this.twoPlayer
  });
};

StageSelectScene.prototype.render = function() {
  this.renderer.clear();

  this.renderer.renderCenteredText('SELECT STAGE', 30, {
    size: 18,
    bold: true,
    color: CONFIG.COLOR.HUD_TEXT,
    shadow: true
  });

  var startX = 120;
  var startY = 80;
  var cellW = 50;
  var cellH = 50;
  var cols = this.stagesPerRow;

  for (var i = 0; i < this.totalLevels; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var cx = startX + col * cellW;
    var cy = startY + row * cellH;
    var unlocked = i <= this.maxStage;
    var selected = i === this.selectedStage;

    if (selected && this.blinkOn) {
      this.renderer.ctx.save();
      this.renderer.ctx.translate(this.renderer.offsetX, this.renderer.offsetY);
      this.renderer.ctx.scale(this.renderer.scale, this.renderer.scale);
      this.renderer.ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
      this.renderer.ctx.globalAlpha = 0.3;
      this.renderer.ctx.fillRect(cx, cy, cellW - 4, cellH - 4);
      this.renderer.ctx.globalAlpha = 1.0;
      this.renderer.ctx.restore();
    }

    var color = unlocked ? CONFIG.COLOR.HUD_TEXT : '#444444';
    this.renderer.renderText(String(i + 1), cx + 15, cy + 15, {
      size: 16,
      bold: true,
      color: color,
      shadow: unlocked
    });
  }

  this.renderer.renderCenteredText('STAGE ' + (this.selectedStage + 1), 310, {
    size: 14,
    bold: true,
    color: CONFIG.COLOR.PLAYER1_BODY,
    shadow: true
  });

  this.renderer.renderCenteredText('TAP STAGE TO START', 335, {
    size: 8,
    color: '#7C7C7C'
  });
};

module.exports = StageSelectScene;
