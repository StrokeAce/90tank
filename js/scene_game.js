var CONFIG = require('./config');
var Utils = require('./utils');
var Storage = require('./storage');
var Audio = require('./audio');
var Maps = require('./maps');
var GameMap = require('./map');
var Tank = require('./tank');
var Bullet = require('./bullet');
var Explosion = require('./explosion');
var PowerUp = require('./powerup');
var EnemyAI = require('./enemy_ai');
var Collision = require('./collision');
var InputManager = require('./input');
var HUD = require('./hud');

function GameScene(renderer, sceneManager) {
  this.renderer = renderer;
  this.sceneManager = sceneManager;

  this.gameMap = null;
  this.input = null;
  this.hud = null;

  this.player1 = null;
  this.player2 = null;
  this.enemies = [];
  this.enemyAIs = [];
  this.explosions = [];
  this.powerups = [];
  this.allBullets = [];

  this.stage = 0;
  this.twoPlayer = false;
  this.score = 0;
  this.lives = CONFIG.GAME.PLAYER_INITIAL_LIVES;
  this.player2Lives = CONFIG.GAME.PLAYER_INITIAL_LIVES;

  this.enemyQueue = [];
  this.enemiesSpawned = 0;
  this.enemySpawnTimer = 0;
  this.enemySpawnInterval = CONFIG.GAME.ENEMY_SPAWN_INTERVAL;
  this.nextSpawnPoint = 0;

  this.freezeTimer = 0;
  this.baseSteelTimer = 0;
  this.gameOver = false;
  this.gameOverTimer = 0;
  this.levelComplete = false;
  this.levelCompleteTimer = 0;
  this.stageIntro = true;
  this.stageIntroTimer = 0;

  this.paused = false;
  this.player1RespawnTimer = 0;
  this.player2RespawnTimer = 0;
  this.playerDeadTimer = 0;

  this.powerupEnemyCounter = 0;
  this.activePowerup = null;
  this.powerupRespawnTimer = 0;
  
  this.powerupTypes = [5, 5, 5, 6, 0, 1, 2, 3, 4];
  this.currentPowerupIndex = 0;
}

GameScene.prototype.enter = function(data) {
  this.stage = data ? data.stage : 0;
  this.twoPlayer = data ? data.twoPlayer : false;

  this.score = 0;
  this.lives = CONFIG.GAME.PLAYER_INITIAL_LIVES;
  this.player2Lives = CONFIG.GAME.PLAYER_INITIAL_LIVES;
  this.gameOver = false;
  this.levelComplete = false;
  this.stageIntro = true;
  this.stageIntroTimer = 0;
  this.paused = false;
  this.enemies = [];
  this.enemyAIs = [];
  this.explosions = [];
  this.powerups = [];
  this.allBullets = [];
  this.playerDeadTimer = 0;

  this.hud = new HUD();
  this.hud.twoPlayer = this.twoPlayer;

  this.input = new InputManager();
  var screenInfo = this.renderer.getScreenInfo();
  this.input.init(screenInfo.width, screenInfo.height, this.twoPlayer);
  this.input.setPauseCallback(this._onPause.bind(this));
  this.input.setPauseMenuCallback(this._onPauseMenuClick.bind(this));

  Audio.init();
  Audio.stopBGM();
  Audio.playStartBGM();

  this._loadStage();
};

GameScene.prototype.exit = function() {
  Audio.stopBGM();
};

GameScene.prototype._loadStage = function() {
  var levelData = Maps.getLevel(this.stage);
  if (!levelData) {
    this.stage = 0;
    levelData = Maps.getLevel(0);
  }

  var progress = Storage.getGameProgress();

  this.gameMap = new GameMap();
  this.gameMap.loadLevel(levelData);

  this.enemyQueue = levelData.enemies.slice();
  this.enemiesSpawned = 0;
  this.enemySpawnTimer = 0;
  this.nextSpawnPoint = 0;
  this.freezeTimer = 0;
  this.baseSteelTimer = 0;
  this.powerupEnemyCounter = 0;
  this.activePowerup = null;
  
  this.powerupTypes = [5, 5, 5, 6, 0, 1, 2, 3, 4];
  this.currentPowerupIndex = 0;
  this.powerupRespawnTimer = 0;

  this._spawnPlayer1();
  if (this.player1 && this.stage > 0) {
    this.player1.starLevel = progress.stars || 0;
    this.player1._applyUpgrade();
  }

  if (this.twoPlayer) {
    this._spawnPlayer2();
    if (this.player2 && this.stage > 0) {
      this.player2.starLevel = progress.stars2 || 0;
      this.player2._applyUpgrade();
    }
  }

  this.stageIntro = true;
  this.stageIntroTimer = 0;

  this.hud.update({
    stage: this.stage + 1,
    enemyCount: this.enemyQueue.length,
    lives: this.lives,
    score: this.score
  });
};

GameScene.prototype._spawnPlayer1 = function() {
  var spawn = CONFIG.GAME.PLAYER1_SPAWN;
  var x = spawn.x * CONFIG.TILE.CELL_SIZE_SCALED;
  var y = spawn.y * CONFIG.TILE.CELL_SIZE_SCALED;

  this._ensureSpawnPositionClear(x, y);

  this.player1 = new Tank(x, y, CONFIG.DIRECTION.UP, true, 0);
  this.player1.starLevel = 0;
  this.player1._applyUpgrade();
  this.player1.setShield(CONFIG.GAME.SPAWN_PROTECTION_TIME);

  this._pushAwayEnemiesFromSpawn(this.player1);
};

GameScene.prototype._spawnPlayer2 = function() {
  var spawn = CONFIG.GAME.PLAYER2_SPAWN;
  var x = spawn.x * CONFIG.TILE.CELL_SIZE_SCALED;
  var y = spawn.y * CONFIG.TILE.CELL_SIZE_SCALED;

  this._ensureSpawnPositionClear(x, y);

  this.player2 = new Tank(x, y, CONFIG.DIRECTION.UP, true, 1);
  this.player2.starLevel = 0;
  this.player2._applyUpgrade();
  this.player2.setShield(CONFIG.GAME.SPAWN_PROTECTION_TIME);

  this._pushAwayEnemiesFromSpawn(this.player2);
};

GameScene.prototype._ensureSpawnPositionClear = function(x, y) {
  var spawnSize = CONFIG.TANK.SIZE_SCALED;

  for (var i = this.enemies.length - 1; i >= 0; i--) {
    var enemy = this.enemies[i];
    if (!enemy.alive) continue;

    if (Utils.rectOverlap(x, y, spawnSize, spawnSize,
                          enemy.x, enemy.y, enemy.width, enemy.height)) {
      this._destroyEnemy(enemy, i);
    }
  }
};

GameScene.prototype._destroyEnemy = function(enemy, index) {
  enemy.alive = false;
  this.explosions.push(new Explosion(enemy.centerX(), enemy.centerY(), false));
  
  if (index !== undefined) {
    this.enemies.splice(index, 1);
    this.enemyAIs.splice(index, 1);
  }
  
  if (enemy.owner && enemy.owner.isPlayer) {
    Audio.playPlayerHit();
  }
};

GameScene.prototype._pushTankAwayFromPosition = function(tank, posX, posY) {
  if (!tank || !tank.alive) return;

  var tankSize = CONFIG.TANK.SIZE_SCALED;
  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;

  var directions = [
    { dx: -tankSize, dy: 0 },
    { dx: tankSize, dy: 0 },
    { dx: 0, dy: -tankSize },
    { dx: 0, dy: tankSize },
    { dx: -tankSize, dy: -tankSize },
    { dx: tankSize, dy: -tankSize },
    { dx: -tankSize, dy: tankSize },
    { dx: tankSize, dy: tankSize }
  ];

  for (var d = 0; d < directions.length; d++) {
    var dir = directions[d];
    var newX = tank.x + dir.dx;
    var newY = tank.y + dir.dy;

    newX = Utils.clamp(newX, 0, mapW - tank.width);
    newY = Utils.clamp(newY, 0, mapH - tank.height);

    var canMove = true;

    for (var i = 0; i < this.enemies.length; i++) {
      var other = this.enemies[i];
      if (!other.alive || other.spawning) continue;
      if (Utils.rectOverlap(newX, newY, tank.width, tank.height,
                            other.x, other.y, other.width, other.height)) {
        canMove = false;
        break;
      }
    }

    if (canMove && tank.isPlayer) {
      var otherPlayer = tank === this.player1 ? this.player2 : this.player1;
      if (otherPlayer && otherPlayer.alive && !otherPlayer.spawning) {
        if (Utils.rectOverlap(newX, newY, tank.width, tank.height,
                              otherPlayer.x, otherPlayer.y, otherPlayer.width, otherPlayer.height)) {
          canMove = false;
        }
      }
    }

    if (canMove) {
      tank.x = newX;
      tank.y = newY;
      break;
    }
  }
};

GameScene.prototype._pushAwayEnemiesFromSpawn = function(playerTank) {
  if (!playerTank) return;

  var tankSize = CONFIG.TANK.SIZE_SCALED;
  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;

  for (var i = 0; i < this.enemies.length; i++) {
    var enemy = this.enemies[i];
    if (!enemy.alive || enemy.spawning) continue;

    if (Utils.rectOverlap(
      playerTank.x, playerTank.y, playerTank.width, playerTank.height,
      enemy.x, enemy.y, enemy.width, enemy.height
    )) {
      var directions = [
        { dx: -tankSize, dy: 0 },
        { dx: tankSize, dy: 0 },
        { dx: 0, dy: -tankSize },
        { dx: 0, dy: tankSize },
        { dx: -tankSize, dy: -tankSize },
        { dx: tankSize, dy: -tankSize },
        { dx: -tankSize, dy: tankSize },
        { dx: tankSize, dy: tankSize }
      ];

      for (var d = 0; d < directions.length; d++) {
        var dir = directions[d];
        var newX = enemy.x + dir.dx;
        var newY = enemy.y + dir.dy;

        newX = Utils.clamp(newX, 0, mapW - enemy.width);
        newY = Utils.clamp(newY, 0, mapH - enemy.height);

        var collisionWithOthers = false;
        for (var j = 0; j < this.enemies.length; j++) {
          if (i === j) continue;
          var other = this.enemies[j];
          if (!other.alive || other.spawning) continue;
          if (Utils.rectOverlap(newX, newY, enemy.width, enemy.height,
                                other.x, other.y, other.width, other.height)) {
            collisionWithOthers = true;
            break;
          }
        }

        if (!collisionWithOthers) {
          enemy.x = newX;
          enemy.y = newY;
          break;
        }
      }
    }
  }
};

GameScene.prototype._spawnEnemy = function() {
  if (this.enemyQueue.length === 0) return;
  if (this.enemies.length >= CONFIG.GAME.MAX_ENEMIES_ON_SCREEN) return;

  var spawnPoints = CONFIG.GAME.ENEMY_SPAWN_POINTS;
  var sp = spawnPoints[this.nextSpawnPoint % spawnPoints.length];
  this.nextSpawnPoint++;

  var x = sp.x * CONFIG.TILE.CELL_SIZE_SCALED;
  var y = sp.y * CONFIG.TILE.CELL_SIZE_SCALED;

  var playerTanks = this._getAlivePlayerTanks();
  for (var i = 0; i < playerTanks.length; i++) {
    var pt = playerTanks[i];
    if (Utils.rectOverlap(x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED,
                          pt.x, pt.y, pt.width, pt.height)) {
      this._pushTankAwayFromPosition(pt, x, y);
    }
  }

  for (var i = 0; i < this.enemies.length; i++) {
    var e = this.enemies[i];
    if (Utils.rectOverlap(x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED,
                          e.x, e.y, e.width, e.height)) {
      return;
    }
  }

  var enemyType = this.enemyQueue.shift();
  var enemy = new Tank(x, y, CONFIG.DIRECTION.DOWN, false);
  enemy.setEnemyType(enemyType);
  enemy.spawning = true;

  this.enemies.push(enemy);

  var ai = new EnemyAI(enemy, this.gameMap, playerTanks);
  this.enemyAIs.push(ai);

  this.enemiesSpawned++;
};

GameScene.prototype._getAlivePlayerTanks = function() {
  var tanks = [];
  if (this.player1 && this.player1.alive) tanks.push(this.player1);
  if (this.twoPlayer && this.player2 && this.player2.alive) tanks.push(this.player2);
  return tanks;
};

GameScene.prototype._getAllTanks = function() {
  var tanks = [];
  if (this.player1 && this.player1.alive) tanks.push(this.player1);
  if (this.twoPlayer && this.player2 && this.player2.alive) tanks.push(this.player2);
  for (var i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].alive) tanks.push(this.enemies[i]);
  }
  return tanks;
};

GameScene.prototype.update = function(dt) {
  if (this.paused) return;

  if (this.stageIntro) {
    this.stageIntroTimer += dt * 1000;
    if (this.stageIntroTimer >= CONFIG.GAME.STAGE_INTRO_DURATION) {
      this.stageIntro = false;
      this._spawnNextPowerup();
    }
    return;
  }

  if (!this.activePowerup && this.currentPowerupIndex < this.powerupTypes.length) {
    this.powerupRespawnTimer += dt * 1000;
    if (this.powerupRespawnTimer >= CONFIG.GAME.POWERUP_RESPAWN_INTERVAL) {
      this._spawnNextPowerup();
      this.powerupRespawnTimer = 0;
    }
  }

  if (this.gameOver) {
    this.gameOverTimer += dt * 1000;
    if (this.gameOverTimer >= CONFIG.GAME.GAME_OVER_DELAY) {
      Storage.setHighScore(this.score);
      this.sceneManager.changeScene('gameover', {
        score: this.score,
        stage: this.stage + 1
      });
    }
    return;
  }

  if (this.levelComplete) {
    this.levelCompleteTimer += dt * 1000;
    if (this.levelCompleteTimer >= CONFIG.GAME.LEVEL_COMPLETE_DELAY) {
      this._advanceToNextStage();
    }
    return;
  }

  this.gameMap.update(dt);

  this._updateFreeze(dt);
  this._updateBaseSteel(dt);
  this._updatePlayerInput(dt);
  this._updateEnemies(dt);
  this._updateBullets(dt);
  this._checkCollisions();
  this._updateExplosions(dt);
  this._updatePowerUps(dt);
  this._updateSpawning(dt);
  this._checkWinCondition();
  this._updateHUD();
};

GameScene.prototype._updateFreeze = function(dt) {
  if (this.freezeTimer > 0) {
    this.freezeTimer -= dt * 1000;
  }
};

GameScene.prototype._updateBaseSteel = function(dt) {
  if (this.baseSteelTimer > 0) {
    this.baseSteelTimer -= dt * 1000;
    if (this.baseSteelTimer <= 0) {
      this.gameMap.fortifyBase(false);
    }
  }
};

GameScene.prototype._updatePlayerInput = function(dt) {
  var allTanks = this._getAllTanks();

  // 更新玩家1
  if (this.player1) {
    if (this.player1.alive && !this.player1.spawning) {
      var p1Input = this.input.getPlayer1Input();
      if (p1Input.moveDirection >= 0) {
        var oldX = this.player1.x;
        var oldY = this.player1.y;
        this.player1.move(p1Input.moveDirection, this.gameMap);
        for (var i = 0; i < allTanks.length; i++) {
          var other = allTanks[i];
          if (other === this.player1 || !other.alive || other.spawning) continue;
          if (Utils.rectOverlap(this.player1.x, this.player1.y, this.player1.width, this.player1.height,
                              other.x, other.y, other.width, other.height)) {
            this.player1.x = oldX;
            this.player1.y = oldY;
            break;
          }
        }
      } else {
        this.player1.moving = false;
      }
      if (p1Input.fire) {
        this.player1.fire();
      }
    }
    this.player1.update(dt);
  }

  // 更新玩家2
  if (this.twoPlayer && this.player2) {
    if (this.player2.alive && !this.player2.spawning) {
      var p2Input = this.input.getPlayer2Input();
      if (p2Input && p2Input.moveDirection >= 0) {
        var oldX = this.player2.x;
        var oldY = this.player2.y;
        this.player2.move(p2Input.moveDirection, this.gameMap);
        for (var i = 0; i < allTanks.length; i++) {
          var other = allTanks[i];
          if (other === this.player2 || !other.alive || other.spawning) continue;
          if (Utils.rectOverlap(this.player2.x, this.player2.y, this.player2.width, this.player2.height,
                              other.x, other.y, other.width, other.height)) {
            this.player2.x = oldX;
            this.player2.y = oldY;
            break;
          }
        }
      } else {
        this.player2.moving = false;
      }
      if (p2Input && p2Input.fire) {
        this.player2.fire();
      }
    }
    this.player2.update(dt);
  }

  this._handlePlayerRespawn(dt);
};

GameScene.prototype._handlePlayerRespawn = function(dt) {
  if (this.player1 && !this.player1.alive && this.lives > 0) {
    this.player1RespawnTimer += dt * 1000;
    if (this.player1RespawnTimer >= CONFIG.GAME.PLAYER_RESPAWN_DELAY) {
      this.player1RespawnTimer = 0;
      this.lives--;
      this._spawnPlayer1();
    }
  }

  if (this.twoPlayer && this.player2 && !this.player2.alive && this.player2Lives > 0) {
    this.player2RespawnTimer += dt * 1000;
    if (this.player2RespawnTimer >= CONFIG.GAME.PLAYER_RESPAWN_DELAY) {
      this.player2RespawnTimer = 0;
      this.player2Lives--;
      this._spawnPlayer2();
    }
  }

  if (!this.twoPlayer && this.player1 && !this.player1.alive && this.lives <= 0) {
    this.playerDeadTimer += dt * 1000;
    if (this.playerDeadTimer >= CONFIG.GAME.PLAYER_DEATH_DELAY) {
      this._triggerGameOver();
    }
  }

  if (this.twoPlayer && this.player1 && !this.player1.alive && this.player2 && !this.player2.alive &&
      this.lives <= 0 && this.player2Lives <= 0) {
    this.playerDeadTimer += dt * 1000;
    if (this.playerDeadTimer >= CONFIG.GAME.PLAYER_DEATH_DELAY) {
      this._triggerGameOver();
    }
  }
};

GameScene.prototype._updateEnemies = function(dt) {
  var frozen = this.freezeTimer > 0;
  var allTanks = this._getAllTanks();

  for (var i = this.enemies.length - 1; i >= 0; i--) {
    var enemy = this.enemies[i];
    if (!enemy.alive) {
      this.enemies.splice(i, 1);
      continue;
    }

    // 即使在冻结状态，也要更新敌人的基础状态（如 spawn 动画）
    enemy.update(dt);

    if (!frozen && !enemy.spawning) {
      var ai = this._findAIForEnemy(enemy);
      if (ai) {
        ai.update(dt, allTanks);
        if (ai.wantsToFire) {
          enemy.fire();
          ai.fireTimer = 0;
          Audio.playEnemyShoot();
          ai.wantsToFire = false;
        }
      }
    }
  }

  for (var i = this.enemyAIs.length - 1; i >= 0; i--) {
    if (!this.enemyAIs[i].tank.alive) {
      this.enemyAIs.splice(i, 1);
    }
  }
};

GameScene.prototype._findAIForEnemy = function(enemy) {
  for (var i = 0; i < this.enemyAIs.length; i++) {
    if (this.enemyAIs[i].tank === enemy) {
      return this.enemyAIs[i];
    }
  }
  return null;
};

GameScene.prototype._updateBullets = function(dt) {
  var self = this;

  function updateTankBullets(tank) {
    if (!tank) return;
    for (var i = tank.bullets.length - 1; i >= 0; i--) {
      var bullet = tank.bullets[i];
      if (!bullet.alive) {
        tank.bullets.splice(i, 1);
        continue;
      }

      bullet.update(dt);

      if (!bullet.alive) {
        self.explosions.push(new Explosion(bullet.centerX(), bullet.centerY(), false));
        tank.bullets.splice(i, 1);
        continue;
      }

      var mapResult = self.gameMap.checkBulletCollision(bullet);
      if (mapResult) {
        bullet.alive = false;
        if (mapResult.hitEagle) {
          self._triggerGameOver();
        }
        if (mapResult.destroyed || mapResult.bounced) {
          self.explosions.push(new Explosion(bullet.centerX(), bullet.centerY(), false));
          if (bullet.owner && bullet.owner.isPlayer) {
            if (mapResult.destroyed) {
              Audio.playHitBrick();
            } else if (mapResult.bounced) {
              Audio.playHitSteel();
            }
          }
        } else {
          self.explosions.push(new Explosion(bullet.centerX(), bullet.centerY(), false));
        }
        tank.bullets.splice(i, 1);
      }
    }
  }

  updateTankBullets(this.player1);
  updateTankBullets(this.player2);

  for (var i = 0; i < this.enemies.length; i++) {
    updateTankBullets(this.enemies[i]);
  }
};

GameScene.prototype._checkCollisions = function() {
  this._checkBulletTankCollisions();
  this._checkBulletBulletCollisions();
  this._checkPowerUpCollisions();
};

GameScene.prototype._checkBulletTankCollisions = function() {
  var self = this;

  function checkBulletsVsTanks(shooter, targets) {
    if (!shooter || !shooter.alive) return;
    for (var bi = shooter.bullets.length - 1; bi >= 0; bi--) {
      var bullet = shooter.bullets[bi];
      if (!bullet.alive) continue;
      for (var ti = 0; ti < targets.length; ti++) {
        var target = targets[ti];
        if (!target.alive || target.spawning) continue;
        if (Collision.checkBulletTank(bullet, target)) {
          bullet.alive = false;
          var destroyed = target.takeDamage(bullet.damage);
          if (destroyed) {
            self.explosions.push(new Explosion(target.centerX(), target.centerY(), true, function() {
              if (target.isPlayer) {
                Audio.playPlayerBoom();
              } else {
                Audio.playEnemyBoom();
              }
            }));
            if (!target.isPlayer) {
                var enemyType = target.enemyType || 0;
                var scoreValues = [100, 200, 300, 400];
                self.score += scoreValues[enemyType] || 100;
              }
          } else {
            if (shooter.isPlayer) {
              if (target.enemyType === CONFIG.ENEMY_TYPE.ARMOR.ID) {
                Audio.playHitSteelEnemy();
              }
            }
          }
          break;
        }
      }
    }
  }

  var playerTanks = this._getAlivePlayerTanks();
  var enemyTanks = this.enemies.filter(function(e) { return e.alive; });

  for (var i = 0; i < playerTanks.length; i++) {
    checkBulletsVsTanks(playerTanks[i], enemyTanks);
  }

  for (var i = 0; i < enemyTanks.length; i++) {
    checkBulletsVsTanks(enemyTanks[i], playerTanks);
  }
};

GameScene.prototype._checkBulletBulletCollisions = function() {
  var p1Bullets = this.player1 ? this.player1.bullets : [];
  var p2Bullets = this.player2 ? this.player2.bullets : [];
  var playerBullets = p1Bullets.concat(p2Bullets);

  for (var i = 0; i < this.enemies.length; i++) {
    var eBullets = this.enemies[i].bullets;
    for (var j = 0; j < playerBullets.length; j++) {
      for (var k = 0; k < eBullets.length; k++) {
        if (Collision.checkBulletBullet(playerBullets[j], eBullets[k])) {
          playerBullets[j].alive = false;
          eBullets[k].alive = false;
        }
      }
    }
  }
};

GameScene.prototype._checkPowerUpCollisions = function() {
  var playerTanks = this._getAlivePlayerTanks();
  for (var i = 0; i < this.powerups.length; i++) {
    var pu = this.powerups[i];
    if (!pu.alive) continue;
    for (var j = 0; j < playerTanks.length; j++) {
      if (Collision.checkPowerUpPlayer(pu, playerTanks[j])) {
        var result = pu.collect(playerTanks[j]);
        if (result) {
          this._applyPowerUp(result, playerTanks[j]);
        }
      }
    }
  }
};

GameScene.prototype._spawnPowerup = function() {
  var px = Utils.randomInt(1, 22) * CONFIG.TILE.CELL_SIZE_SCALED;
  var py = Utils.randomInt(1, 20) * CONFIG.TILE.CELL_SIZE_SCALED;
  var type = Utils.randomInt(0, 5);
  var powerup = new PowerUp(px, py, type);
  this.powerups.push(powerup);
  this.activePowerup = powerup;
  Audio.playPropAppear();
};

GameScene.prototype._spawnNextPowerup = function() {
  if (this.currentPowerupIndex >= this.powerupTypes.length) {
    return;
  }
  
  var type = this.powerupTypes[this.currentPowerupIndex];
  var powerup = null;
  var maxAttempts = 100;
  var attempts = 0;
  
  while (!powerup && attempts < maxAttempts) {
    var col = Utils.randomInt(1, CONFIG.TILE.BIG_TILE_COLS - 2);
    var row = Utils.randomInt(1, CONFIG.TILE.BIG_TILE_ROWS - 2);
    var px = col * CONFIG.TILE.CELL_SIZE_SCALED * 2;
    var py = row * CONFIG.TILE.CELL_SIZE_SCALED * 2;
    
    if (this._isValidPowerupPosition(px, py)) {
      powerup = new PowerUp(px, py, type);
    }
    attempts++;
  }
  
  if (powerup) {
    this.powerups.push(powerup);
    this.activePowerup = powerup;
    this.currentPowerupIndex++;
    Audio.playPropAppear();
  }
};

GameScene.prototype._isValidPowerupPosition = function(x, y) {
  var tileCol = Math.floor(x / CONFIG.TILE.CELL_SIZE_SCALED);
  var tileRow = Math.floor(y / CONFIG.TILE.CELL_SIZE_SCALED);
  
  for (var dr = 0; dr < 2; dr++) {
    for (var dc = 0; dc < 2; dc++) {
      var checkRow = tileRow + dr;
      var checkCol = tileCol + dc;
      
      if (checkRow >= 0 && checkRow < this.gameMap.rows && 
          checkCol >= 0 && checkCol < this.gameMap.cols) {
        var tileType = this.gameMap.terrain[checkRow][checkCol];
        if (tileType !== CONFIG.TILE_TYPE.EMPTY) {
          return false;
        }
      }
    }
  }
  
  for (var i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].alive && this.enemies[i].collidesWith(x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED)) {
      return false;
    }
  }
  
  for (var i = 0; i < this.powerups.length; i++) {
    if (this.powerups[i].alive && this.powerups[i].collidesWith(x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED)) {
      return false;
    }
  }
  
  return true;
};

GameScene.prototype._applyPowerUp = function(result, player) {
  switch (result.effect) {
    case 'freeze':
      this.freezeTimer = result.duration;
      break;
    case 'grenade':
      for (var i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].alive && !this.enemies[i].spawning) {
          this.enemies[i].alive = false;
          this.explosions.push(new Explosion(this.enemies[i].centerX(), this.enemies[i].centerY(), true));
        }
      }
      Audio.playEnemyBoom();
      break;
    case 'shield':
      player.setShield(result.duration);
      break;
    case 'shovel':
      this.gameMap.fortifyBase(true);
      this.baseSteelTimer = result.duration;
      break;
    case 'extraLife':
      if (player.playerIndex === 0) {
        this.lives++;
      } else {
        this.player2Lives++;
      }
      Audio.playMoreLife();
      break;
    case 'upgrade':
      player.upgrade(1);
      break;
    case 'gun':
      player.setGun(result.duration);
      var currentLevel = player.starLevel;
      player.upgrade(result.upgradeAmount || 2);
      if (player.starLevel === currentLevel) {
        Audio.playPowerup();
      }
      break;
  }
  
  this.powerupRespawnTimer = 0;
};

GameScene.prototype._updateExplosions = function(dt) {
  for (var i = this.explosions.length - 1; i >= 0; i--) {
    this.explosions[i].update(dt);
    if (!this.explosions[i].alive) {
      this.explosions.splice(i, 1);
    }
  }
};

GameScene.prototype._updatePowerUps = function(dt) {
  for (var i = this.powerups.length - 1; i >= 0; i--) {
    this.powerups[i].update(dt);
    if (!this.powerups[i].alive) {
      if (this.activePowerup === this.powerups[i]) {
        this.activePowerup = null;
      }
      this.powerups.splice(i, 1);
    }
  }
};

GameScene.prototype._updateSpawning = function(dt) {
  if (this.enemyQueue.length > 0) {
    this.enemySpawnTimer += dt * 1000;
    if (this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      this._spawnEnemy();
    }
  }
};

GameScene.prototype._checkWinCondition = function() {
  if (this.gameOver || this.levelComplete) return;

  var allEnemiesDead = this.enemyQueue.length === 0 && this.enemies.length === 0;
  if (allEnemiesDead) {
    this.levelComplete = true;
    this.levelCompleteTimer = 0;
    Audio.stopBGM();
    Audio.playLevelComplete();
  }
};

GameScene.prototype._advanceToNextStage = function() {
  var nextStage = this.stage + 1;
  if (nextStage >= Maps.totalLevels) {
    Storage.setHighScore(this.score);
    Storage.setMaxStage(Maps.totalLevels);
    this.sceneManager.changeScene('gameover', {
      score: this.score,
      stage: Maps.totalLevels,
      victory: true
    });
    return;
  }

  Storage.setMaxStage(nextStage + 1);
  Storage.saveGameProgress({
    stage: nextStage + 1,
    lives: this.lives,
    score: this.score,
    stars: this.player1 ? this.player1.starLevel : 0,
    stars2: (this.twoPlayer && this.player2) ? this.player2.starLevel : 0
  });

  this.stage = nextStage;
  this.levelComplete = false;
  this.enemies = [];
  this.enemyAIs = [];
  this.explosions = [];
  this.powerups = [];
  this._loadStage();
};

GameScene.prototype._triggerGameOver = function() {
  if (this.gameOver) return;
  this.gameOver = true;
  this.gameOverTimer = 0;
  Audio.stopBGM();
  Audio.playGameOver();
};

GameScene.prototype._onPause = function(paused) {
  this.paused = paused;
  if (paused) {
    Audio.playPause();
  }
};

GameScene.prototype._onPauseMenuClick = function(tx, ty) {
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;

  if (ty >= centerY + 10 && ty <= centerY + 30) {
    if (tx >= centerX - 60 && tx <= centerX - 20) {
      this.paused = false;
      this.input._paused = false;
    } else if (tx >= centerX + 20 && tx <= centerX + 60) {
      Storage.saveGameProgress({
        stage: this.stage + 1,
        lives: this.lives,
        score: this.score,
        stars: 0,
        stars2: 0
      });
      this.sceneManager.changeScene('menu');
    }
  }
};

GameScene.prototype._updateHUD = function() {
  var enemyCount = this.enemyQueue.length;
  this.hud.update({
    score: this.score,
    lives: this.lives,
    stage: this.stage + 1,
    enemyCount: enemyCount,
    player2Lives: this.player2Lives,
    player2Score: this.score,
    player1Stars: this.player1 ? this.player1.starLevel : 0,
    player2Stars: this.player2 ? this.player2.starLevel : 0
  });
};

GameScene.prototype.render = function() {
  this.renderer.beginFrame();

  if (this.stageIntro) {
    this.renderer.renderOverlay(0.5, '#000000');
    var ctx = this.renderer.ctx;
    var centerX = this.renderer.screenWidth / 2;
    var centerY = this.renderer.screenHeight / 2;
    ctx.save();
    ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('第 ' + (this.stage + 1) + ' 关', centerX, centerY);
    ctx.restore();
    return;
  }

  this.renderer.renderMap(this.gameMap);

  for (var i = 0; i < this.powerups.length; i++) {
    this.renderer.renderPowerup(this.powerups[i]);
  }

  if (this.player1 && this.player1.alive) {
    this.renderer.renderTank(this.player1);
    this.renderer.renderBullets(this.player1);
  }
  if (this.twoPlayer && this.player2 && this.player2.alive) {
    this.renderer.renderTank(this.player2);
    this.renderer.renderBullets(this.player2);
  }

  for (var i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].alive) {
      this.renderer.renderTank(this.enemies[i]);
      this.renderer.renderBullets(this.enemies[i]);
    }
  }

  this.renderer.renderForest(this.gameMap);

  for (var i = 0; i < this.explosions.length; i++) {
    this.renderer.renderExplosion(this.explosions[i]);
  }

  this.renderer.renderHUD(this.hud);

  this.renderer.renderInput(this.input);

  if (this.paused) {
    this.renderer.renderOverlay(0.5, '#000000');
    var ctx = this.renderer.ctx;
    var centerX = this.renderer.screenWidth / 2;
    var centerY = this.renderer.screenHeight / 2;
    ctx.save();
    ctx.fillStyle = CONFIG.COLOR.HUD_TEXT;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂停', centerX, centerY - 30);

    ctx.font = '14px monospace';
    ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
    ctx.fillText('继续', centerX - 40, centerY + 20);

    ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
    ctx.fillText('退出', centerX + 40, centerY + 20);
    ctx.restore();
  }

  if (this.gameOver) {
    this.renderer.renderOverlay(0.6, '#000000');
    var ctx = this.renderer.ctx;
    var centerX = this.renderer.screenWidth / 2;
    var centerY = this.renderer.screenHeight / 2;
    ctx.save();
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', centerX, centerY);
    ctx.restore();
  }

  if (this.levelComplete) {
    this.renderer.renderOverlay(0.3, '#000000');
    var ctx = this.renderer.ctx;
    var centerX = this.renderer.screenWidth / 2;
    var centerY = this.renderer.screenHeight / 2;
    ctx.save();
    ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('关卡通过!', centerX, centerY);
    ctx.restore();
  }
};

module.exports = GameScene;
