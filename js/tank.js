var Entity = require('./entity');
var CONFIG = require('./config');
var Utils = require('./utils');
var Audio = require('./audio');
var Bullet = require('./bullet');
var Sprites = require('./sprites');

var _sprites = null;
function getSprites() {
  if (!_sprites) _sprites = Sprites.generateAll();
  return _sprites;
}

function Tank(x, y, direction, isPlayer, playerIndex) {
  Entity.call(this, x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED);

  this.direction = direction || CONFIG.DIRECTION.UP;
  this.isPlayer = isPlayer;
  this.playerIndex = playerIndex || 0;
  this.speed = 0;
  this.starLevel = 0;
  this.hp = 1;
  this.maxHp = 1;
  this.alive = true;
  this.shielded = false;
  this.shieldTimer = 0;
  this.shieldFrame = 0;
  this.shieldFrameTimer = 0;
  
  this.canPierceSteel = false;
  this.canPierceForest = false;
  this.canPierceWater = false;
  this.bulletDamage = 1;

  this.spawning = true;
  this.spawnTimer = 0;
  this.spawnFrame = 0;
  this.spawnFrameTimer = 0;

  this.animFrame = 0;
  this.animTimer = 0;
  this.animInterval = 150;

  this.fireTimer = 0;
  this.fireRate = 60;
  this.bullets = [];
  this.maxBullets = 1;
  this.bulletSpeed = 240;
  this.canPierceSteel = false;

  this.moving = false;
  this.moveIntent = -1;

  this.onIce = false;
  this.iceSlideTimer = 0;
  this.iceSlideSpeed = 0;
  this.iceSlideDir = -1;

  this.flashTimer = 0;
  this.flashOn = false;

  this.moveSoundTimer = 0;
}

Tank.prototype = Object.create(Entity.prototype);
Tank.prototype.constructor = Tank;

Tank.prototype.update = function(dt) {
  if (!this.alive) return;

  if (this.spawning) {
    this._updateSpawn(dt);
    return;
  }

  if (this.shielded) {
    this.shieldTimer -= dt * 1000;
    this.shieldFrameTimer += dt * 1000;
    if (this.shieldFrameTimer >= 100) {
      this.shieldFrameTimer = 0;
      this.shieldFrame = (this.shieldFrame + 1) % 2;
    }
    if (this.shieldTimer <= 0) {
      this.shielded = false;
    }
  }
  


  if (this.flashTimer > 0) {
    this.flashTimer -= dt * 1000;
    this.flashOn = !this.flashOn;
  } else {
    this.flashOn = false;
  }

  this._updateBullets(dt);

  this.fireTimer = Math.max(0, this.fireTimer - dt * 1000);

  if (this.moveSoundTimer > 0) {
    this.moveSoundTimer -= dt * 1000;
  }

  if (this.moving) {
    this.animTimer += dt * 1000;
    if (this.animTimer >= this.animInterval) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }
  }
};

Tank.prototype._updateSpawn = function(dt) {
  this.spawnTimer += dt * 1000;
  this.spawnFrameTimer += dt * 1000;
  if (this.spawnFrameTimer >= CONFIG.TANK.SPAWN_FLASH_INTERVAL) {
    this.spawnFrameTimer = 0;
    this.spawnFrame = (this.spawnFrame + 1) % 4;
  }
  if (this.spawnTimer >= CONFIG.TANK.SPAWN_FLASH_DURATION) {
    this.spawning = false;
  }
};

Tank.prototype._updateBullets = function(dt) {
  for (var i = this.bullets.length - 1; i >= 0; i--) {
    this.bullets[i].update(dt);
    if (!this.bullets[i].alive) {
      this.bullets.splice(i, 1);
    }
  }
};

Tank.prototype.move = function(direction, map) {
  if (!this.alive || this.spawning) return;
  this.moveIntent = direction;
  this.moving = true;

  var oldDir = this.direction;
  this.direction = direction;

  var dx = CONFIG.DIRECTION.DX[direction];
  var dy = CONFIG.DIRECTION.DY[direction];
  var newX = this.x + dx * this.speed * (1 / 60);
  var newY = this.y + dy * this.speed * (1 / 60);

  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;
  newX = Utils.clamp(newX, 0, mapW - this.width);
  newY = Utils.clamp(newY, 0, mapH - this.height);

  if (direction !== oldDir) {
    if (direction === CONFIG.DIRECTION.UP || direction === CONFIG.DIRECTION.DOWN) {
      newX = Utils.snapToGrid(newX);
    } else {
      newY = Utils.snapToGrid(newY);
    }
    newX = Utils.clamp(newX, 0, mapW - this.width);
    newY = Utils.clamp(newY, 0, mapH - this.height);
  }

  if (map) {
    var collision = map.checkTankCollision(newX, newY, this.width, this.height, this);
    if (!collision) {
      this.x = newX;
      this.y = newY;
      if (this.isPlayer && this.moveSoundTimer <= 0) {
        Audio.playPlayerMove();
        this.moveSoundTimer = 120;
      }
    }
  } else {
    this.x = newX;
    this.y = newY;
    if (this.isPlayer && this.moveSoundTimer <= 0) {
      Audio.playPlayerMove();
      this.moveSoundTimer = 120;
    }
  }
};

Tank.prototype.fire = function() {
  if (!this.alive || this.spawning) return null;
  if (this.fireTimer > 0) return null;
  if (this.bullets.length >= this.maxBullets) return null;

  this.fireTimer = this.fireRate;

  var bx, by;
  var bulletSize = CONFIG.TANK.BULLET_SIZE_SCALED;
  var halfTank = this.width / 2;
  var halfBullet = bulletSize / 2;

  switch (this.direction) {
    case CONFIG.DIRECTION.UP:
      bx = this.x + halfTank - halfBullet;
      by = this.y - bulletSize;
      break;
    case CONFIG.DIRECTION.RIGHT:
      bx = this.x + this.width;
      by = this.y + halfTank - halfBullet;
      break;
    case CONFIG.DIRECTION.DOWN:
      bx = this.x + halfTank - halfBullet;
      by = this.y + this.height;
      break;
    case CONFIG.DIRECTION.LEFT:
      bx = this.x - bulletSize;
      by = this.y + halfTank - halfBullet;
      break;
  }

  var bullet = new Bullet(bx, by, this.direction, this.bulletSpeed, this, this.canPierceSteel, this.bulletDamage, this.canPierceForest, this.canPierceWater);
  this.bullets.push(bullet);
  if (this.isPlayer) {
    Audio.playPlayerShoot();
    console.log('Player bullet created - canPierceForest:', bullet.canPierceForest, '- canPierceWater:', bullet.canPierceWater);
  }
  return bullet;
};

Tank.prototype.takeDamage = function(damage) {
  if (this.shielded || this.spawning) return false;

  var dmg = damage || 1;
  this.hp -= dmg;
  if (this.hp <= 0) {
    this.alive = false;
    return true;
  }

  this.flashTimer = CONFIG.GAME.ARMOR_FLASH_DURATION;
  return false;
};

Tank.prototype.setShield = function(duration) {
  this.shielded = true;
  this.shieldTimer = duration;
};

Tank.prototype.setGun = function(duration) {
  this.canPierceSteel = true;
};

Tank.prototype.upgrade = function(amount) {
  if (!this.isPlayer) return;
  var add = amount || 1;
  this.starLevel = Math.min(this.starLevel + add, CONFIG.GAME.MAX_PLAYER_STARS);
  this._applyUpgrade();
};

Tank.prototype._applyUpgrade = function() {
  if (!this.isPlayer) return;
  var lvl = this.starLevel;
  this.speed = CONFIG.TANK.PLAYER_SPEEDS[lvl];
  this.bulletSpeed = CONFIG.TANK.PLAYER_BULLET_SPEEDS[lvl];
  this.maxBullets = CONFIG.TANK.PLAYER_BULLET_COUNTS[lvl];
  this.fireRate = CONFIG.TANK.PLAYER_FIRE_RATES[lvl] * (1000 / 60);
  this.bulletDamage = CONFIG.TANK.PLAYER_BULLET_DAMAGE[lvl];
  this.canPierceSteel = CONFIG.TANK.PLAYER_CAN_PIERCE_STEEL[lvl];
  this.canPierceForest = CONFIG.TANK.PLAYER_CAN_PIERCE_FOREST[lvl];
  this.canPierceWater = CONFIG.TANK.PLAYER_CAN_PIERCE_WATER[lvl];
  console.log('Tank upgraded to level', lvl + 1, '- canPierceForest:', this.canPierceForest, '- canPierceWater:', this.canPierceWater);
};

Tank.prototype.render = function(ctx) {
  if (!this.alive) return;

  var sprites = getSprites();

  if (this.spawning) {
    if (this.spawnFrame < sprites.spawn.length && sprites.spawn[this.spawnFrame]) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.width / sprites.spawn[this.spawnFrame].width, this.height / sprites.spawn[this.spawnFrame].height);
      sprites.spawn[this.spawnFrame].drawFn(ctx, sprites.spawn[this.spawnFrame].width, sprites.spawn[this.spawnFrame].height);
      ctx.restore();
    }
    return;
  }

  var sprite = null;
  if (this.isPlayer) {
    var playerSprites = this.playerIndex === 0 ? sprites.player1 : sprites.player2;
    var starIdx = Math.min(this.starLevel, 3);
    sprite = playerSprites[this.direction][starIdx][this.animFrame];
  } else {
    if (this.maxHp > 1 && this.hp > 0 && this.hp <= 4) {
      var armorSprites = sprites.enemyArmor[this.hp - 1];
      if (armorSprites && armorSprites[this.direction]) {
        sprite = armorSprites[this.direction][this.animFrame];
      }
    }
    if (!sprite) {
      var typeIdx = this.enemyType !== undefined ? this.enemyType : 0;
      if (sprites.enemies[typeIdx]) {
        sprite = sprites.enemies[typeIdx][this.direction][this.animFrame];
      } else {
        sprite = sprites.enemies[0][this.direction][this.animFrame];
      }
    }
  }

  if (this.flashOn) {
    ctx.globalAlpha = 0.5;
  }

  if (sprite) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.width / sprite.width, this.height / sprite.height);
    sprite.drawFn(ctx, sprite.width, sprite.height);
    ctx.restore();
  }

  ctx.globalAlpha = 1.0;

  if (this.shielded && this.shieldFrame < sprites.shield.length && sprites.shield[this.shieldFrame]) {
    var shieldSprite = sprites.shield[this.shieldFrame];
    ctx.save();
    ctx.translate(this.x - 2, this.y - 2);
    ctx.scale((this.width + 4) / shieldSprite.width, (this.height + 4) / shieldSprite.height);
    shieldSprite.drawFn(ctx, shieldSprite.width, shieldSprite.height);
    ctx.restore();
  }
};

Tank.prototype.renderBullets = function(ctx) {
  for (var i = 0; i < this.bullets.length; i++) {
    this.bullets[i].render(ctx);
  }
};

Tank.prototype.setEnemyType = function(type) {
  switch (type) {
    case 0:
      this.speed = CONFIG.ENEMY_TYPE.BASIC.SPEED;
      this.hp = CONFIG.ENEMY_TYPE.BASIC.HP;
      this.maxHp = CONFIG.ENEMY_TYPE.BASIC.HP;
      this.bulletSpeed = CONFIG.ENEMY_TYPE.BASIC.BULLET_SPEED;
      this.maxBullets = CONFIG.ENEMY_TYPE.BASIC.BULLET_COUNT;
      this.fireRate = CONFIG.ENEMY_TYPE.BASIC.FIRE_RATE * (1000 / 60);
      this.enemyType = 0;
      break;
    case 1:
      this.speed = CONFIG.ENEMY_TYPE.FAST.SPEED;
      this.hp = CONFIG.ENEMY_TYPE.FAST.HP;
      this.maxHp = CONFIG.ENEMY_TYPE.FAST.HP;
      this.bulletSpeed = CONFIG.ENEMY_TYPE.FAST.BULLET_SPEED;
      this.maxBullets = CONFIG.ENEMY_TYPE.FAST.BULLET_COUNT;
      this.fireRate = CONFIG.ENEMY_TYPE.FAST.FIRE_RATE * (1000 / 60);
      this.enemyType = 1;
      break;
    case 2:
      this.speed = CONFIG.ENEMY_TYPE.POWER.SPEED;
      this.hp = CONFIG.ENEMY_TYPE.POWER.HP;
      this.maxHp = CONFIG.ENEMY_TYPE.POWER.HP;
      this.bulletSpeed = CONFIG.ENEMY_TYPE.POWER.BULLET_SPEED;
      this.maxBullets = CONFIG.ENEMY_TYPE.POWER.BULLET_COUNT;
      this.fireRate = CONFIG.ENEMY_TYPE.POWER.FIRE_RATE * (1000 / 60);
      this.enemyType = 2;
      break;
    case 3:
      this.speed = CONFIG.ENEMY_TYPE.ARMOR.SPEED;
      this.hp = CONFIG.ENEMY_TYPE.ARMOR.HP;
      this.maxHp = CONFIG.ENEMY_TYPE.ARMOR.HP;
      this.bulletSpeed = CONFIG.ENEMY_TYPE.ARMOR.BULLET_SPEED;
      this.maxBullets = CONFIG.ENEMY_TYPE.ARMOR.BULLET_COUNT;
      this.fireRate = CONFIG.ENEMY_TYPE.ARMOR.FIRE_RATE * (1000 / 60);
      this.enemyType = 3;
      break;
  }
};

module.exports = Tank;
