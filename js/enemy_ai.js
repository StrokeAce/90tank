var CONFIG = require('./config');
var Utils = require('./utils');
var Audio = require('./audio');

function EnemyAI(tank, gameMap, playerTanks) {
  this.tank = tank;
  this.map = gameMap;
  this.playerTanks = playerTanks;
  this.thinkTimer = 0;
  this.thinkInterval = 1000;
  this.currentDir = CONFIG.DIRECTION.DOWN;
  this.moveTime = 0;
  this.maxMoveTime = 2000;
  this.stuckTimer = 0;
  this.stuckThreshold = 500;
  this.lastX = 0;
  this.lastY = 0;
  this.wantsToFire = false;
  this.fireTimer = 0;
  this.fireInterval = 0;
  this.moveSoundTimer = 0;
}

EnemyAI.prototype.update = function(dt, allTanks) {
  if (!this.tank.alive || this.tank.spawning) return;

  this.thinkTimer += dt * 1000;
  this.moveTime += dt * 1000;
  this.fireTimer += dt * 1000;

  this._checkStuck(dt);

  if (this.thinkTimer >= this.thinkInterval || this.moveTime >= this.maxMoveTime || this.stuckTimer > this.stuckThreshold) {
    this._decide();
    this.thinkTimer = 0;
    this.moveTime = 0;
    this.stuckTimer = 0;
  }

  this.tank.direction = this.currentDir;
  this.tank.moving = true;

  var dx = CONFIG.DIRECTION.DX[this.currentDir];
  var dy = CONFIG.DIRECTION.DY[this.currentDir];
  var newX = this.tank.x + dx * this.tank.speed * dt;
  var newY = this.tank.y + dy * this.tank.speed * dt;

  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;
  newX = Utils.clamp(newX, 0, mapW - this.tank.width);
  newY = Utils.clamp(newY, 0, mapH - this.tank.height);

  if (this.currentDir === CONFIG.DIRECTION.UP || this.currentDir === CONFIG.DIRECTION.DOWN) {
    newX = Utils.snapToGrid(newX);
  } else {
    newY = Utils.snapToGrid(newY);
  }
  newX = Utils.clamp(newX, 0, mapW - this.tank.width);
  newY = Utils.clamp(newY, 0, mapH - this.tank.height);

  var canMove = !this.map.checkTankCollision(newX, newY, this.tank.width, this.tank.height, this.tank);

  if (canMove && allTanks) {
    for (var i = 0; i < allTanks.length; i++) {
      var other = allTanks[i];
      if (other === this.tank || !other.alive || other.spawning) continue;
      if (Utils.rectOverlap(newX, newY, this.tank.width, this.tank.height,
                            other.x, other.y, other.width, other.height)) {
        canMove = false;
        break;
      }
    }
  }

  if (canMove) {
    this.tank.x = newX;
    this.tank.y = newY;
    if (this.moveSoundTimer <= 0) {
      Audio.playEnemyMove();
      this.moveSoundTimer = 120;
    }
  }

  if (this.moveSoundTimer > 0) {
    this.moveSoundTimer -= dt * 60;
  }

  this.fireTimer += dt * 1000;

  if (this.fireInterval <= 0) {
    this.fireInterval = this.tank.fireRate + Utils.randomInt(0, 1000);
  }

  this.wantsToFire = false;
  if (this.fireTimer >= this.fireInterval && this._shouldFire()) {
    this.wantsToFire = true;
    this.fireTimer = 0;
    this.fireInterval = this.tank.fireRate + Utils.randomInt(0, 1000);
  }
};

EnemyAI.prototype._checkStuck = function(dt) {
  var dx = Math.abs(this.tank.x - this.lastX);
  var dy = Math.abs(this.tank.y - this.lastY);
  if (dx < 0.5 && dy < 0.5) {
    this.stuckTimer += dt * 1000;
  } else {
    this.stuckTimer = 0;
  }
  this.lastX = this.tank.x;
  this.lastY = this.tank.y;
};

EnemyAI.prototype._decide = function() {
  var r = Math.random();

  if (r < 0.3 && this.playerTanks) {
    var target = this._findNearestPlayer();
    if (target) {
      this.currentDir = this._directionToward(target);
      return;
    }
  }

  if (r < 0.5) {
    this.currentDir = CONFIG.DIRECTION.DOWN;
    return;
  }

  this.currentDir = Utils.randomInt(0, 3);
};

EnemyAI.prototype._findNearestPlayer = function() {
  var nearest = null;
  var minDist = Infinity;

  for (var i = 0; i < this.playerTanks.length; i++) {
    var p = this.playerTanks[i];
    if (!p.alive) continue;
    var dist = Utils.distance(this.tank.centerX(), this.tank.centerY(),
                              p.centerX(), p.centerY());
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
};

EnemyAI.prototype._directionToward = function(target) {
  var dx = target.centerX() - this.tank.centerX();
  var dy = target.centerY() - this.tank.centerY();

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? CONFIG.DIRECTION.RIGHT : CONFIG.DIRECTION.LEFT;
  }
  return dy > 0 ? CONFIG.DIRECTION.DOWN : CONFIG.DIRECTION.UP;
};

EnemyAI.prototype._shouldFire = function() {
  if (!this.playerTanks) return Math.random() < 0.02;

  for (var i = 0; i < this.playerTanks.length; i++) {
    var p = this.playerTanks[i];
    if (!p.alive) continue;

    if (this.tank.direction === CONFIG.DIRECTION.UP && p.centerY() < this.tank.centerY() &&
        Math.abs(p.centerX() - this.tank.centerX()) < this.tank.width) {
      return true;
    }
    if (this.tank.direction === CONFIG.DIRECTION.DOWN && p.centerY() > this.tank.centerY() &&
        Math.abs(p.centerX() - this.tank.centerX()) < this.tank.width) {
      return true;
    }
    if (this.tank.direction === CONFIG.DIRECTION.LEFT && p.centerX() < this.tank.centerX() &&
        Math.abs(p.centerY() - this.tank.centerY()) < this.tank.height) {
      return true;
    }
    if (this.tank.direction === CONFIG.DIRECTION.RIGHT && p.centerX() > this.tank.centerX() &&
        Math.abs(p.centerY() - this.tank.centerY()) < this.tank.height) {
      return true;
    }
  }

  return Math.random() < 0.01;
};

module.exports = EnemyAI;
