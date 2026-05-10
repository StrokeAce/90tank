var CONFIG = require('./config');
var Utils = require('./utils');
var Storage = require('./storage');

function GameOverScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;
  this.score = 0;
  this.stage = 1;
  this.victory = false;
  this.timer = 0;
  this.inputCooldown = 0;
}

GameOverScene.prototype.enter = function(data) {
  this.score = data ? data.score : 0;
  this.stage = data ? data.stage : 1;
  this.victory = data ? data.victory : false;
  this.timer = 0;
  this.inputCooldown = 1.0;

  Storage.setHighScore(this.score);
};

GameOverScene.prototype.exit = function() {
};

GameOverScene.prototype.handleTouchStart = function(e) {
  if (this.inputCooldown > 0) return;
  this.sceneManager.changeScene('menu');
};

GameOverScene.prototype.update = function(dt) {
  this.timer += dt;
  this.inputCooldown = Math.max(0, this.inputCooldown - dt);
};

GameOverScene.prototype.render = function() {
  this.renderer.clear();
  var ctx = this.renderer.ctx;
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;
  var scale = this.renderer.scale;

  ctx.save();

  var title = this.victory ? 'VICTORY!' : 'GAME OVER';
  var titleColor = this.victory ? CONFIG.COLOR.PLAYER1_BODY : '#FF4444';

  ctx.fillStyle = titleColor;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, centerX, 80 * scale);

  ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
  ctx.font = '14px monospace';
  ctx.fillText('得分', centerX, 140 * scale);

  ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(Utils.formatScore(this.score), centerX, 165 * scale);

  ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
  ctx.font = '12px monospace';
  ctx.fillText('到达关卡: ' + this.stage, centerX, 210 * scale);

  ctx.fillText('最高分: ' + Utils.formatScore(Storage.getHighScore()), centerX, 240 * scale);

  if (this.inputCooldown <= 0) {
    var blink = Math.floor(this.timer * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#7C7C7C';
      ctx.font = '10px monospace';
      ctx.fillText('点击继续', centerX, 300 * scale);
    }
  }

  ctx.restore();
};

module.exports = GameOverScene;
