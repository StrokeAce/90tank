var Entity = require('./entity');
var CONFIG = require('./config');
var Sprites = require('./sprites');

var _sprites = null;
function getSprites() {
  if (!_sprites) _sprites = Sprites.generateAll();
  return _sprites;
}

function Explosion(x, y, isLarge, onComplete) {
  var size = isLarge ? 32 : 16;
  var scaledSize = isLarge ? 48 : 24;
  Entity.call(this, x - scaledSize / 2, y - scaledSize / 2, scaledSize, scaledSize);

  this.isLarge = isLarge;
  this.frame = 0;
  this.frameTimer = 0;
  this.frameDuration = 100;
  this.totalFrames = 3;
  this.onComplete = onComplete;
  this.finished = false;
}

Explosion.prototype = Object.create(Entity.prototype);
Explosion.prototype.constructor = Explosion;

Explosion.prototype.update = function(dt) {
  if (this.finished) return;

  this.frameTimer += dt * 1000;
  if (this.frameTimer >= this.frameDuration) {
    this.frameTimer = 0;
    this.frame++;
    if (this.frame >= this.totalFrames) {
      this.finished = true;
      this.alive = false;
      if (this.onComplete) this.onComplete();
    }
  }
};

Explosion.prototype.render = function(ctx) {
  if (this.finished) return;
  var sprites = getSprites();
  var spriteList = this.isLarge ? sprites.explosionLarge : sprites.explosionSmall;
  if (this.frame < spriteList.length && spriteList[this.frame]) {
    var sprite = spriteList[this.frame];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.width / sprite.width, this.height / sprite.height);
    sprite.drawFn(ctx, sprite.width, sprite.height);
    ctx.restore();
  }
};

module.exports = Explosion;
