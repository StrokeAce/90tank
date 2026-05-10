var Entity = require('./entity');
var CONFIG = require('./config');
var Audio = require('./audio');
var Sprites = require('./sprites');

var _sprites = null;
function getSprites() {
  if (!_sprites) _sprites = Sprites.generateAll();
  return _sprites;
}

function Bullet(x, y, direction, speed, owner, canPierceSteel, damage, canPierceForest, canPierceWater) {
  var w = CONFIG.TANK.BULLET_SIZE_SCALED;
  var h = CONFIG.TANK.BULLET_SIZE_SCALED;
  Entity.call(this, x, y, w, h);

  this.direction = direction;
  this.speed = speed;
  this.owner = owner;
  this.canPierceSteel = canPierceSteel || false;
  this.canPierceForest = canPierceForest || false;
  this.canPierceWater = canPierceWater || false;
  this.damage = damage || 1;
  this.alive = true;
}

Bullet.prototype = Object.create(Entity.prototype);
Bullet.prototype.constructor = Bullet;

Bullet.prototype.update = function(dt) {
  if (!this.alive) return;

  var dx = CONFIG.DIRECTION.DX[this.direction];
  var dy = CONFIG.DIRECTION.DY[this.direction];
  this.x += dx * this.speed * dt;
  this.y += dy * this.speed * dt;

  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;
  if (this.x < 0 || this.y < 0 || this.x + this.width > mapW || this.y + this.height > mapH) {
    this.alive = false;
  }
};

Bullet.prototype.render = function(ctx) {
  if (!this.alive) return;
  var sprites = getSprites();
  var sprite = sprites.bullets[this.direction];
  if (sprite) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.width / sprite.width, this.height / sprite.height);
    sprite.drawFn(ctx, sprite.width, sprite.height);
    ctx.restore();
  } else {
    ctx.fillStyle = CONFIG.COLOR.BULLET_COLOR;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
};

module.exports = Bullet;
