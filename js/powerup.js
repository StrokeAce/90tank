var Entity = require('./entity');
var CONFIG = require('./config');
var Audio = require('./audio');
var Sprites = require('./sprites');

var _sprites = null;
function getSprites() {
  if (!_sprites) _sprites = Sprites.generateAll();
  return _sprites;
}

function PowerUp(x, y, type) {
  Entity.call(this, x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED);
  this.type = type;
  this.frameTimer = 0;
  this.frame = 0;
  this.duration = CONFIG.GAME.POWERUP_DURATION;
  this.elapsed = 0;
  this.flashInterval = 200;
}

PowerUp.prototype = Object.create(Entity.prototype);
PowerUp.prototype.constructor = PowerUp;

PowerUp.prototype.update = function(dt) {
  if (!this.alive) return;

  this.elapsed += dt * 1000;
  if (this.elapsed >= this.duration) {
    this.alive = false;
    return;
  }

  this.frameTimer += dt * 1000;
  if (this.frameTimer >= this.flashInterval) {
    this.frameTimer = 0;
    this.frame = (this.frame + 1) % 2;
  }
};

PowerUp.prototype.render = function(ctx) {
  if (!this.alive) return;
  var sprites = getSprites();
  if (this.type < sprites.powerups.length && sprites.powerups[this.type][this.frame]) {
    var sprite = sprites.powerups[this.type][this.frame];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.width / sprite.width, this.height / sprite.height);
    sprite.drawFn(ctx, sprite.width, sprite.height);
    ctx.restore();
  }
};

PowerUp.prototype.collect = function(player) {
  this.alive = false;
  Audio.playPowerup();

  switch (this.type) {
    case CONFIG.POWERUP_TYPE.CLOCK.ID:
      return { effect: 'freeze', duration: CONFIG.GAME.FREEZE_DURATION };
    case CONFIG.POWERUP_TYPE.GRENADE.ID:
      return { effect: 'grenade' };
    case CONFIG.POWERUP_TYPE.HELMET.ID:
      return { effect: 'shield', duration: CONFIG.GAME.SHIELD_DURATION };
    case CONFIG.POWERUP_TYPE.SHOVEL.ID:
      return { effect: 'shovel', duration: CONFIG.GAME.BASE_STEEL_DURATION };
    case CONFIG.POWERUP_TYPE.TANK.ID:
      return { effect: 'extraLife' };
    case CONFIG.POWERUP_TYPE.STAR.ID:
      return { effect: 'upgrade' };
  }
  return null;
};

module.exports = PowerUp;
