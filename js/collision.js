var CONFIG = require('./config');
var Utils = require('./utils');

var Collision = {
  checkTankTank: function(tank1, tank2) {
    if (!tank1.alive || !tank2.alive) return false;
    if (tank1.spawning || tank2.spawning) return false;
    return Utils.rectOverlap(
      tank1.x, tank1.y, tank1.width, tank1.height,
      tank2.x, tank2.y, tank2.width, tank2.height
    );
  },

  checkBulletTank: function(bullet, tank) {
    if (!bullet.alive || !tank.alive) return false;
    if (tank.spawning) return false;
    if (bullet.owner === tank) return false;
    if (tank.shielded) return false;

    var isPlayerBullet = bullet.owner && bullet.owner.isPlayer;
    if (isPlayerBullet && tank.isPlayer) return false;
    if (!isPlayerBullet && !tank.isPlayer) return false;

    return Utils.rectOverlap(
      bullet.x, bullet.y, bullet.width, bullet.height,
      tank.x, tank.y, tank.width, tank.height
    );
  },

  checkBulletBullet: function(b1, b2) {
    if (!b1.alive || !b2.alive) return false;
    return Utils.rectOverlap(
      b1.x, b1.y, b1.width, b1.height,
      b2.x, b2.y, b2.width, b2.height
    );
  },

  checkPowerUpPlayer: function(powerup, player) {
    if (!powerup.alive || !player.alive) return false;
    return Utils.rectOverlap(
      powerup.x, powerup.y, powerup.width, powerup.height,
      player.x, player.y, player.width, player.height
    );
  },

  resolveTankMovement: function(tank, newX, newY, allTanks) {
    var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
    var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;

    newX = Utils.clamp(newX, 0, mapW - tank.width);
    newY = Utils.clamp(newY, 0, mapH - tank.height);

    for (var i = 0; i < allTanks.length; i++) {
      var other = allTanks[i];
      if (other === tank || !other.alive || other.spawning) continue;
      if (Utils.rectOverlap(newX, newY, tank.width, tank.height,
                            other.x, other.y, other.width, other.height)) {
        return { x: tank.x, y: tank.y, blocked: true };
      }
    }

    return { x: newX, y: newY, blocked: false };
  }
};

module.exports = Collision;
