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

  this.powerupEnemyCounter = 0;
  this.activePowerup = null;
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

  this.hud = new HUD();
  this.hud.twoPlayer = this.twoPlayer;

  this.input = new InputManager();
  var screenInfo = this.renderer.getScreenInfo();
  this.input.init(screenInfo.width, screenInfo.height, this.twoPlayer);
  this.input.setPauseCallback(this._onPause.bind(this));
  this.input.setPauseMenuCallback(this._onPauseMenuClick.bind(this));

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

  this._spawnPlayer1();

  if (this.twoPlayer) {
    this._spawnPlayer2();
  }

  this.stageIntro = true;
  this.stageIntroTimer = 0;

  this.hud.update({
    stage: this.stage + 1,
    enemyCount: this.enemyQueue.length,
    lives: this.lives,
    score: this.score
  });

  Audio.startBGM();
};

GameScene.prototype._spawnPlayer1 = function() {
  var spawn = CONFIG.GAME.PLAYER1_SPAWN;
  var x = spawn.x * CONFIG.TILE.CELL_SIZE_SCALED;
  var y = spawn.y * CONFIG.TILE.CELL_SIZE_SCALED;

  this.player1 = new Tank(x, y, CONFIG.DIRECTION.UP, true, 0);
  this.player1.speed = CONFIG.TANK.PLAYER_SPEEDS[0];
  this.player1.bulletSpeed = CONFIG.TANK.PLAYER_BULLET_SPEEDS[0];
  this.player1.maxBullets = CONFIG.TANK.PLAYER_BULLET_COUNTS[0];
  this.player1.fireRate = CONFIG.TANK.PLAYER_FIRE_RATES[0] * (1000 / 60);
  this.player1.setShield(CONFIG.GAME.SPAWN_PROTECTION_TIME);
};

GameScene.prototype._spawnPlayer2 = function() {
  var spawn = CONFIG.GAME.PLAYER2_SPAWN;
  var x = spawn.x * CONFIG.TILE.CELL_SIZE_SCALED;
  var y = spawn.y * CONFIG.TILE.CELL_SIZE_SCALED;

  this.player2 = new Tank(x, y, CONFIG.DIRECTION.UP, true, 1);
  this.player2.speed = CONFIG.TANK.PLAYER_SPEEDS[0];
  this.player2.bulletSpeed = CONFIG.TANK.PLAYER_BULLET_SPEEDS[0];
  this.player2.maxBullets = CONFIG.TANK.PLAYER_BULLET_COUNTS[0];
  this.player2.fireRate = CONFIG.TANK.PLAYER_FIRE_RATES[0] * (1000 / 60);
  this.player2.setShield(CONFIG.GAME.SPAWN_PROTECTION_TIME);
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
      return;
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
  Audio.playSpawn();
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
    }
    return;
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
    this._triggerGameOver();
  }

  if (this.twoPlayer && this.player1 && !this.player1.alive && this.player2 && !this.player2.alive &&
      this.lives <= 0 && this.player2Lives <= 0) {
    this._triggerGameOver();
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
          if (mapResult.bounced) {
            Audio.playSteelHit();
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
          var destroyed = target.takeDamage();
          if (destroyed) {
            self.explosions.push(new Explosion(target.centerX(), target.centerY(), true, function() {
              Audio.playBigExplosion();
            }));
            if (!target.isPlayer) {
              var enemyType = target.enemyType || 0;
              var scoreValues = [100, 200, 300, 400];
              self.score += scoreValues[enemyType] || 100;
              self.powerupEnemyCounter++;
              if (self.powerupEnemyCounter >= CONFIG.GAME.POWERUP_SPAWN_ENEMY_COUNT && !self.activePowerup) {
                self._spawnPowerup();
                self.powerupEnemyCounter = 0;
              }
            }
          } else {
            Audio.playHit();
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
      Audio.playBigExplosion();
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
      break;
    case 'upgrade':
      player.upgrade();
      break;
  }
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
    stars: this.player1 ? this.player1.starLevel : 0
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
};

GameScene.prototype._onPauseMenuClick = function(tx, ty) {
  var centerX = this.renderer.screenWidth / 2;
  var centerY = this.renderer.screenHeight / 2;

  if (ty >= centerY + 10 && ty <= centerY + 30) {
    this.paused = false;
    this.input._paused = false;
  } else if (ty >= centerY + 40 && ty <= centerY + 60) {
    this.sceneManager.changeScene('menu');
  }
};

GameScene.prototype._updateHUD = function() {
  var enemyCount = this.enemyQueue.length + this.enemies.length;
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
    ctx.fillText('STAGE ' + (this.stage + 1), centerX, centerY);
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
    ctx.fillText('PAUSED', centerX, centerY - 30);

    ctx.font = '14px monospace';
    ctx.fillStyle = CONFIG.COLOR.PLAYER1_BODY;
    ctx.fillText('RESUME', centerX, centerY + 20);

    ctx.fillStyle = '#888888';
    ctx.fillText('QUIT', centerX, centerY + 50);
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
    ctx.fillText('GAME OVER', centerX, centerY);
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
    ctx.fillText('STAGE CLEAR!', centerX, centerY);
    ctx.restore();
  }
};

module.exports = GameScene;
