var CONFIG = require('./config');
var Sprites = require('./sprites');

function Renderer() {
  this.canvas = null;
  this.ctx = null;
  this.screenWidth = 0;
  this.screenHeight = 0;
  this.gameWidth = CONFIG.SCREEN.WIDTH;
  this.gameHeight = CONFIG.SCREEN.HEIGHT;
  this.scale = 1;
  this.offsetX = 0;
  this.offsetY = 0;
  this.mapOffsetX = 0;
  this.mapOffsetY = 0;
  this._sprites = null;
}

Renderer.prototype.init = function(mainCanvas) {
  this.canvas = mainCanvas;
  this.ctx = this.canvas.getContext('2d');
  this.screenWidth = mainCanvas.savedWidth || mainCanvas.width || 750;
  this.screenHeight = mainCanvas.savedHeight || mainCanvas.height || 1334;
  this._sprites = Sprites.generateAll();
  this._calculateLayout();
};

Renderer.prototype._calculateLayout = function() {
  // 不缩放，保持原始尺寸
  this.scale = 1;

  var renderedW = CONFIG.TILE.MAP_WIDTH_SCALED * this.scale;
  var renderedH = CONFIG.TILE.MAP_HEIGHT_SCALED * this.scale;
  
  // 居中放置
  this.offsetX = Math.floor((this.screenWidth - renderedW) / 2);
  this.offsetY = Math.floor((this.screenHeight - renderedH) / 2);

  this.mapOffsetX = this.offsetX;
  this.mapOffsetY = this.offsetY;
};

Renderer.prototype.clear = function() {
  this.ctx.fillStyle = CONFIG.COLOR.BLACK;
  this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
};

Renderer.prototype.drawBorder = function() {
  this.ctx.save();

  var bw = CONFIG.TILE.BORDER_WIDTH * this.scale;
  var mapX = this.mapOffsetX;
  var mapY = this.mapOffsetY;
  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED * this.scale;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED * this.scale;

  this.ctx.fillStyle = CONFIG.COLOR.BORDER_COLOR;
  this.ctx.fillRect(mapX - bw, mapY - bw, mapW + bw * 2, bw);
  this.ctx.fillRect(mapX - bw, mapY + mapH, mapW + bw * 2, bw);
  this.ctx.fillRect(mapX - bw, mapY, bw, mapH);
  this.ctx.fillRect(mapX + mapW, mapY, bw, mapH);

  this.ctx.restore();
};

Renderer.prototype.beginFrame = function() {
  this.clear();
  this.drawBorder();
};

Renderer.prototype.getGameContext = function() {
  return this.ctx;
};

Renderer.prototype.getMapOffset = function() {
  return {
    x: this.mapOffsetX,
    y: this.mapOffsetY,
    scale: this.scale
  };
};

Renderer.prototype.renderMap = function(gameMap) {
  this.ctx.save();
  this.ctx.translate(this.mapOffsetX, this.mapOffsetY);
  this.ctx.scale(this.scale, this.scale);
  gameMap.render(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderForest = function(gameMap) {
  this.ctx.save();
  this.ctx.translate(this.mapOffsetX, this.mapOffsetY);
  this.ctx.scale(this.scale, this.scale);
  gameMap.renderForest(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderTank = function(tank) {
  this.ctx.save();
  this.ctx.translate(this.mapOffsetX, this.mapOffsetY);
  this.ctx.scale(this.scale, this.scale);
  tank.render(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderBullets = function(tank) {
  this.ctx.save();
  this.ctx.translate(this.mapOffsetX, this.mapOffsetY);
  this.ctx.scale(this.scale, this.scale);
  tank.renderBullets(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderExplosion = function(explosion) {
  this.ctx.save();
  this.ctx.translate(this.mapOffsetX, this.mapOffsetY);
  this.ctx.scale(this.scale, this.scale);
  explosion.render(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderPowerup = function(powerup) {
  this.ctx.save();
  this.ctx.translate(this.mapOffsetX, this.mapOffsetY);
  this.ctx.scale(this.scale, this.scale);
  powerup.render(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderHUD = function(hud) {
  this.ctx.save();
  this.ctx.translate(this.offsetX, this.offsetY);
  this.ctx.scale(this.scale, this.scale);
  hud.render(this.ctx);
  this.ctx.restore();
};

Renderer.prototype.renderInput = function(inputManager) {
  inputManager.render(this.ctx);
};

Renderer.prototype.renderText = function(text, x, y, options) {
  this.ctx.save();
  this.ctx.translate(this.offsetX, this.offsetY);
  this.ctx.scale(this.scale, this.scale);

  var font = (options.bold ? 'bold ' : '') + (options.size || 12) + 'px ' + (options.fontFamily || 'monospace');
  this.ctx.font = font;
  this.ctx.fillStyle = options.color || CONFIG.COLOR.HUD_TEXT;
  this.ctx.textAlign = options.align || 'left';
  this.ctx.textBaseline = options.baseline || 'top';

  if (options.shadow) {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(text, x + 1, y + 1);
    this.ctx.fillStyle = options.color || CONFIG.COLOR.HUD_TEXT;
  }

  this.ctx.fillText(text, x, y);
  this.ctx.restore();
};

Renderer.prototype.renderOverlay = function(alpha, color) {
  this.ctx.fillStyle = color || '#000000';
  this.ctx.globalAlpha = alpha || 0.5;
  this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
  this.ctx.globalAlpha = 1.0;
};

Renderer.prototype.renderCenteredText = function(text, y, options) {
  options = options || {};
  options.align = 'center';
  this.renderText(text, this.gameWidth / 2, y, options);
};

Renderer.prototype.getScreenInfo = function() {
  return {
    width: this.screenWidth,
    height: this.screenHeight,
    scale: this.scale,
    offsetX: this.offsetX,
    offsetY: this.offsetY,
    mapOffsetX: this.mapOffsetX,
    mapOffsetY: this.mapOffsetY
  };
};

module.exports = Renderer;
