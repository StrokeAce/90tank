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

  var title = this.victory ? 'VICTORY!' : 'GAME OVER';
  var titleColor = this.victory ? CONFIG.COLOR.PLAYER1_BODY : '#FF4444';

  this.renderer.renderCenteredText(title, 80, {
    size: 24,
    bold: true,
    color: titleColor,
    shadow: true
  });

  this.renderer.renderCenteredText('SCORE', 140, {
    size: 14,
    color: CONFIG.COLOR.HUD_TEXT
  });

  this.renderer.renderCenteredText(Utils.formatScore(this.score), 165, {
    size: 20,
    bold: true,
    color: CONFIG.COLOR.PLAYER1_BODY,
    shadow: true
  });

  this.renderer.renderCenteredText('STAGE REACHED: ' + this.stage, 210, {
    size: 12,
    color: CONFIG.COLOR.HUD_TEXT
  });

  this.renderer.renderCenteredText('HIGH SCORE: ' + Utils.formatScore(Storage.getHighScore()), 240, {
    size: 12,
    color: CONFIG.COLOR.HUD_TEXT
  });

  if (this.inputCooldown <= 0) {
    var blink = Math.floor(this.timer * 2) % 2 === 0;
    if (blink) {
      this.renderer.renderCenteredText('TAP TO CONTINUE', 300, {
        size: 10,
        color: '#7C7C7C'
      });
    }
  }
};

module.exports = GameOverScene;
