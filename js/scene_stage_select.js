var CONFIG = require('./config');
var Utils = require('./utils');
var Storage = require('./storage');
var Audio = require('./audio');

function StageSelectScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;
  this.selectedStage = 0;
  this.maxStage = Storage.getMaxStage() - 1;
  this.twoPlayer = false;
  this.stagesPerRow = 10;
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

  var tx = touch.clientX;
  var ty = touch.clientY;
  var scale = this.renderer.scale;

  if (tx >= 10 * scale && tx <= 70 * scale && ty >= 15 * scale && ty <= 35 * scale) {
    this.sceneManager.changeScene('menu');
    return;
  }

  var centerX = this.renderer.screenWidth / 2;

  var cols = this.stagesPerRow;
  var cellW = 45 * scale;
  var cellH = 45 * scale;
  var totalW = cols * cellW;
  var startX = centerX - totalW / 2;
  var startY = 60 * scale;

  for (var i = 0; i < this.totalLevels; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var cx = startX + col * cellW;
    var cy = startY + row * cellH;

    if (tx >= cx && tx < cx + cellW && ty >= cy && ty < cy + cellH) {
      if (i <= this.maxStage) {
        this.selectedStage = i;
        this._confirmSelection();
      }
      return;
    }
  }

  if (ty > 375 * scale) {
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
  var ctx = this.renderer.ctx;
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;
  var scale = this.renderer.scale;

  ctx.save();
  ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('选择关卡', centerX, 20 * scale);

  var cols = this.stagesPerRow;
  var rows = Math.ceil(this.totalLevels / cols);
  var cellW = 45 * scale;
  var cellH = 45 * scale;
  var totalW = cols * cellW;
  var totalH = rows * cellH;
  var startX = centerX - totalW / 2;
  var startY = 60 * scale;

  for (var i = 0; i < this.totalLevels; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var cx = startX + col * cellW;
    var cy = startY + row * cellH;
    var unlocked = i <= this.maxStage;
    var selected = i === this.selectedStage;

    if (selected && this.blinkOn) {
      ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(cx, cy, cellW - 4, cellH - 4);
      ctx.globalAlpha = 1.0;
    }

    var color = unlocked ? CONFIG.COLOR.HUD_TEXT : '#444444';
    ctx.fillStyle = color;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx + cellW / 2, cy + cellH / 2);
  }

  ctx.fillStyle = '#7C7C7C';
  ctx.font = '8px monospace';
  ctx.fillText('点击关卡开始', centerX, 380 * scale);

  ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('◀ 返回', 10 * scale, 20 * scale);
  ctx.restore();
};

module.exports = StageSelectScene;
