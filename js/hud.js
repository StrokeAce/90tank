var CONFIG = require('./config');
var Utils = require('./utils');

function HUD() {
  this.score = 0;
  this.lives = 3;
  this.stage = 1;
  this.enemyCount = 20;
  this.twoPlayer = false;
  this.player2Lives = 3;
  this.player2Score = 0;
  this.player1Stars = 0;
  this.player2Stars = 0;
}

HUD.prototype.update = function(data) {
  if (data.score !== undefined) this.score = data.score;
  if (data.lives !== undefined) this.lives = data.lives;
  if (data.stage !== undefined) this.stage = data.stage;
  if (data.enemyCount !== undefined) this.enemyCount = data.enemyCount;
  if (data.twoPlayer !== undefined) this.twoPlayer = data.twoPlayer;
  if (data.player2Lives !== undefined) this.player2Lives = data.player2Lives;
  if (data.player2Score !== undefined) this.player2Score = data.player2Score;
  if (data.player1Stars !== undefined) this.player1Stars = data.player1Stars;
  if (data.player2Stars !== undefined) this.player2Stars = data.player2Stars;
};

HUD.prototype.render = function(ctx) {
  this._renderEnemyIcons(ctx);
  this._renderPlayerLivesCount(ctx);
};

HUD.prototype._renderEnemyIcons = function(ctx) {
  if (this.enemyCount <= 0) return;

  var mapRight = CONFIG.TILE.MAP_OFFSET_X + CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapTop = CONFIG.TILE.MAP_OFFSET_Y;
  var borderW = CONFIG.TILE.BORDER_WIDTH;

  var startX = mapRight + borderW + 4;
  var startY = mapTop - borderW;
  var iconSize = 8;
  var padding = 2;
  var cols = 2;

  ctx.fillStyle = CONFIG.COLOR.HUD_ENEMY_ICON;
  for (var i = 0; i < this.enemyCount; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var x = startX + col * (iconSize + padding);
    var y = startY + row * (iconSize + padding);
    this._drawMiniTank(ctx, x, y, iconSize);
  }
};

HUD.prototype._drawMiniTank = function(ctx, x, y, size) {
  var s = size;
  ctx.fillStyle = CONFIG.COLOR.ENEMY_BASIC_BODY;
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = CONFIG.COLOR.ENEMY_BASIC_TRACK;
  ctx.fillRect(x, y, 1, s);
  ctx.fillRect(x + s - 1, y, 1, s);
  ctx.fillStyle = CONFIG.COLOR.ENEMY_BASIC_TURRET;
  ctx.fillRect(x + Math.floor(s / 2) - 1, y, 2, Math.floor(s / 2));
};

HUD.prototype._renderPlayerInfo = function(ctx) {
  var infoX = CONFIG.TILE.MAP_OFFSET_X + CONFIG.TILE.MAP_WIDTH_SCALED + 8;

  var p1Y = CONFIG.TILE.MAP_OFFSET_Y + CONFIG.TILE.MAP_HEIGHT_SCALED - 40;

  ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
  ctx.fillRect(infoX, p1Y, 8, 8);
  ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(Utils.formatScore(this.score), infoX, p1Y + 12);
  ctx.fillText('x' + this.lives, infoX + 10, p1Y);

  if (this.twoPlayer) {
    var p2Y = p1Y + 25;
    ctx.fillStyle = CONFIG.COLOR.PLAYER2_BODY;
    ctx.fillRect(infoX, p2Y, 8, 8);
    ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
    ctx.fillText(Utils.formatScore(this.player2Score), infoX, p2Y + 12);
    ctx.fillText('x' + this.player2Lives, infoX + 10, p2Y);
  }
};

HUD.prototype._renderStageInfo = function(ctx) {
  var stageX = CONFIG.TILE.MAP_OFFSET_X + CONFIG.TILE.MAP_WIDTH_SCALED + 8;
  var stageY = CONFIG.TILE.MAP_OFFSET_Y + CONFIG.TILE.MAP_HEIGHT_SCALED - 8;

  ctx.fillStyle = CONFIG.COLOR.HUD_FLAG_ICON;
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ST ' + this.stage, stageX, stageY);
};

HUD.prototype._renderPlayerLivesCount = function(ctx) {
  var mapRight = CONFIG.TILE.MAP_OFFSET_X + CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapBottom = CONFIG.TILE.MAP_OFFSET_Y + CONFIG.TILE.MAP_HEIGHT_SCALED;
  var borderW = CONFIG.TILE.BORDER_WIDTH;

  var startX = mapRight + borderW + 4;
  var startY = mapBottom - 30;
  var iconSize = 8;
  var textOffsetX = iconSize + 4;
  var lineHeight = 12;

  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  this._drawPlayerMiniTank(ctx, startX, startY, iconSize, 1);
  ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
  ctx.fillText(this.lives.toString(), startX + textOffsetX, startY);

  if (this.twoPlayer) {
    var p2Y = startY + lineHeight;
    this._drawPlayerMiniTank(ctx, startX, p2Y, iconSize, 2);
    ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
    ctx.fillText(this.player2Lives.toString(), startX + textOffsetX, p2Y);
  }
};

HUD.prototype._drawPlayerMiniTank = function(ctx, x, y, size, playerNum) {
  var s = size;
  if (playerNum === 1) {
    ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = CONFIG.COLOR.PLAYER1_TRACK;
    ctx.fillRect(x, y, 1, s);
    ctx.fillRect(x + s - 1, y, 1, s);
    ctx.fillStyle = CONFIG.COLOR.PLAYER1_TURRET;
    ctx.fillRect(x + Math.floor(s / 2) - 1, y, 2, Math.floor(s / 2));
  } else {
    ctx.fillStyle = CONFIG.COLOR.PLAYER2_BODY;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = CONFIG.COLOR.PLAYER2_TRACK;
    ctx.fillRect(x, y, 1, s);
    ctx.fillRect(x + s - 1, y, 1, s);
    ctx.fillStyle = CONFIG.COLOR.PLAYER2_TURRET;
    ctx.fillRect(x + Math.floor(s / 2) - 1, y, 2, Math.floor(s / 2));
  }
};

module.exports = HUD;
