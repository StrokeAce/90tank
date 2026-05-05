const app = getApp();
const AudioManager = require('../../utils/audio.js');

const TILE_SIZE = 26;
const MAP_WIDTH = 26;
const MAP_HEIGHT = 26;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

const TILE_EMPTY = 0;
const TILE_BRICK = 1;
const TILE_STEEL = 2;
const TILE_WATER = 3;
const TILE_TREE = 4;
const TILE_ICE = 5;
const TILE_BASE = 6;

const DIRECTION_UP = 0;
const DIRECTION_RIGHT = 1;
const DIRECTION_DOWN = 2;
const DIRECTION_LEFT = 3;

const POWERUP_CLOCK = 'clock';
const POWERUP_GRENADE = 'grenade';
const POWERUP_HELMET = 'helmet';
const POWERUP_SHOVEL = 'shovel';
const POWERUP_TANK = 'tank';
const POWERUP_STAR = 'star';

const POWERUP_TYPES = [
  POWERUP_CLOCK, POWERUP_GRENADE, POWERUP_HELMET,
  POWERUP_SHOVEL, POWERUP_TANK, POWERUP_STAR
];

const LEVELS = [
  require('../../utils/levels/level1.js'),
  require('../../utils/levels/level2.js'),
  require('../../utils/levels/level3.js'),
  require('../../utils/levels/level4.js'),
  require('../../utils/levels/level5.js'),
  require('../../utils/levels/level6.js'),
  require('../../utils/levels/level7.js'),
  require('../../utils/levels/level8.js'),
  require('../../utils/levels/level9.js'),
  require('../../utils/levels/level10.js'),
];

const DIFFICULTY_CONFIG = {
  easy: {
    enemySpeed: 1,
    enemyFireRate: 1500,
    enemyBulletSpeed: 3,
    spawnRate: 3000,
    singlePlayerBonus: true
  },
  medium: {
    enemySpeed: 1.5,
    enemyFireRate: 1000,
    enemyBulletSpeed: 4,
    spawnRate: 2500,
    singlePlayerBonus: false
  },
  hard: {
    enemySpeed: 2,
    enemyFireRate: 700,
    enemyBulletSpeed: 5,
    spawnRate: 2000,
    singlePlayerBonus: false
  }
};

class Tank {
  constructor(x, y, direction, isPlayer, playerId) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.turretAngle = direction * Math.PI / 2;
    this.isPlayer = isPlayer;
    this.playerId = playerId || 1;
    this.speed = isPlayer ? 2 : 1.5;
    this.width = TILE_SIZE - 4;
    this.height = TILE_SIZE - 4;
    this.isMoving = false;
    this.canFire = true;
    this.fireRate = 500;
    this.lastFireTime = 0;
    this.isAlive = true;
    this.hasSuperBullet = false;
    this.superBulletTime = 0;
    this.isInvincible = false;
    this.invincibleTime = 0;
    this.starLevel = 0;
    this.shieldActive = false;
    this.shieldTime = 0;
  }

  update(currentTime, map, tanks) {
    if (!this.isAlive) return;

    if (this.isInvincible && currentTime > this.invincibleTime) {
      this.isInvincible = false;
    }

    if (this.hasSuperBullet && currentTime > this.superBulletTime) {
      this.hasSuperBullet = false;
    }

    if (this.shieldActive && currentTime > this.shieldTime) {
      this.shieldActive = false;
    }

    if (this.isMoving) {
      const speed = this.starLevel >= 2 ? this.speed * 1.5 : this.speed;
      let newX = this.x;
      let newY = this.y;

      switch (this.direction) {
        case DIRECTION_UP: newY -= speed; break;
        case DIRECTION_DOWN: newY += speed; break;
        case DIRECTION_LEFT: newX -= speed; break;
        case DIRECTION_RIGHT: newX += speed; break;
      }

      if (!this.checkCollision(newX, newY, map, tanks)) {
        this.x = newX;
        this.y = newY;
      }
    }
  }

  checkCollision(x, y, map, tanks) {
    const left = x;
    const right = x + this.width;
    const top = y;
    const bottom = y + this.height;

    if (left < 0 || right > CANVAS_WIDTH || top < 0 || bottom > CANVAS_HEIGHT) {
      return true;
    }

    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const tile = map[ty][tx];
        if (tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER) {
          const tileLeft = tx * TILE_SIZE;
          const tileRight = tileLeft + TILE_SIZE;
          const tileTop = ty * TILE_SIZE;
          const tileBottom = tileTop + TILE_SIZE;

          if (right > tileLeft && left < tileRight && bottom > tileTop && top < tileBottom) {
            return true;
          }
        }
      }
    }

    for (const tank of tanks) {
      if (tank !== this && tank.isAlive) {
        if (right > tank.x && left < tank.x + tank.width &&
            bottom > tank.y && top < tank.y + tank.height) {
          return true;
        }
      }
    }

    return false;
  }

  fire(bullets, currentTime) {
    if (!this.canFire || !this.isAlive) return null;
    if (currentTime - this.lastFireTime < this.fireRate) return null;

    this.lastFireTime = currentTime;

    let bulletX = this.x + this.width / 2;
    let bulletY = this.y + this.height / 2;

    const fireDir = this.isPlayer ? this.getDirectionFromAngle(this.turretAngle) : this.direction;

    switch (fireDir) {
      case DIRECTION_UP: bulletY = this.y - 4; break;
      case DIRECTION_DOWN: bulletY = this.y + this.height + 4; break;
      case DIRECTION_LEFT: bulletX = this.x - 4; break;
      case DIRECTION_RIGHT: bulletX = this.x + this.width + 4; break;
    }

    return {
      x: bulletX,
      y: bulletY,
      direction: fireDir,
      speed: this.starLevel >= 1 ? 7 : 5,
      isPlayerBullet: this.isPlayer,
      playerId: this.playerId,
      isSuper: this.hasSuperBullet || this.starLevel >= 3
    };
  }

  getDirectionFromAngle(angle) {
    const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const deg = normalized * 180 / Math.PI;
    if (deg < 45 || deg >= 315) return DIRECTION_UP;
    if (deg >= 45 && deg < 135) return DIRECTION_RIGHT;
    if (deg >= 135 && deg < 225) return DIRECTION_DOWN;
    return DIRECTION_LEFT;
  }

  getHitbox() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }
}

class Bullet {
  constructor(x, y, direction, speed, isPlayerBullet, playerId, isSuper) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.isPlayerBullet = isPlayerBullet;
    this.playerId = playerId;
    this.isSuper = isSuper || false;
    this.size = 4;
    this.isAlive = true;
  }

  update() {
    switch (this.direction) {
      case DIRECTION_UP: this.y -= this.speed; break;
      case DIRECTION_DOWN: this.y += this.speed; break;
      case DIRECTION_LEFT: this.x -= this.speed; break;
      case DIRECTION_RIGHT: this.x += this.speed; break;
    }

    if (this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT) {
      this.isAlive = false;
    }
  }

  getHitbox() {
    return {
      left: this.x - this.size,
      right: this.x + this.size,
      top: this.y - this.size,
      bottom: this.y + this.size
    };
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = TILE_SIZE;
    this.isAlive = true;
    this.spawnTime = Date.now();
    this.duration = 15000;
  }

  update(currentTime) {
    if (currentTime - this.spawnTime > this.duration) {
      this.isAlive = false;
    }
  }

  getHitbox() {
    return {
      left: this.x,
      right: this.x + this.size,
      top: this.y,
      bottom: this.y + this.size
    };
  }
}

class EnemyTank extends Tank {
  constructor(x, y, direction, config, type) {
    super(x, y, direction, false);
    this.speed = config.enemySpeed;
    this.fireRate = config.enemyFireRate;
    this.bulletSpeed = config.enemyBulletSpeed;
    this.aiState = 'patrol';
    this.patrolDir = Math.floor(Math.random() * 4);
    this.patrolTime = 0;
    this.thinkTime = 0;
    this.targetDirection = direction;
    this.type = type || ['basic', 'fast', 'power', 'armor'][Math.floor(Math.random() * 4)];
    this.lastFireTime = 0;
    this.isFlashing = Math.random() < 0.15;
    this.flashTimer = 0;

    if (this.type === 'fast') {
      this.speed = config.enemySpeed * 1.5;
    } else if (this.type === 'armor') {
      this.speed = config.enemySpeed * 0.7;
      this.width = TILE_SIZE - 2;
      this.height = TILE_SIZE - 2;
    }
  }

  updateAI(currentTime, map, playerTanks, basePos, allEnemies) {
    if (!this.isAlive) return;

    this.update(currentTime, map, []);

    if (this.isFlashing) {
      this.flashTimer = currentTime;
    }

    let bullet = null;
    if (currentTime - this.lastFireTime >= this.fireRate) {
      this.lastFireTime = currentTime;
      bullet = this.fire([], currentTime);
      if (bullet) {
        bullet.speed = this.bulletSpeed;
      }
    }

    if (currentTime - this.thinkTime < 300) return bullet;
    this.thinkTime = currentTime;

    this.isMoving = true;

    if (this.checkWallCollision(map)) {
      this.targetDirection = Math.floor(Math.random() * 4);
    }

    if (Math.random() < 0.15) {
      this.targetDirection = Math.floor(Math.random() * 4);
    }

    if (this.direction !== this.targetDirection) {
      this.direction = this.targetDirection;
    }

    let newX = this.x;
    let newY = this.y;

    switch (this.direction) {
      case DIRECTION_UP: newY -= this.speed; break;
      case DIRECTION_DOWN: newY += this.speed; break;
      case DIRECTION_LEFT: newX -= this.speed; break;
      case DIRECTION_RIGHT: newX += this.speed; break;
    }

    if (!this.checkCollision(newX, newY, map, allEnemies || [])) {
      this.x = newX;
      this.y = newY;
    } else {
      this.targetDirection = Math.floor(Math.random() * 4);
      this.direction = this.targetDirection;
    }

    if (this.type === 'power' && Math.random() < 0.3) {
      this.hasSuperBullet = true;
    }

    return bullet;
  }

  checkWallCollision(map) {
    const hb = this.getHitbox();
    const w = this.width;
    const h = this.height;
    let tx = Math.floor((hb.left + w / 2) / TILE_SIZE);
    let ty = Math.floor((hb.top + h / 2) / TILE_SIZE);

    switch (this.direction) {
      case DIRECTION_UP: ty -= 1; break;
      case DIRECTION_DOWN: ty += 1; break;
      case DIRECTION_LEFT: tx -= 1; break;
      case DIRECTION_RIGHT: tx += 1; break;
    }

    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
      return true;
    }

    const tile = map[ty][tx];
    if (tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER) {
      return true;
    }

    return Math.random() < 0.02;
  }
}

Page({
  data: {
    level: 1,
    lives1: 3,
    lives2: 3,
    enemyCount: 20,
    isPaused: false,
    gameOver: false,
    gameWin: false,
    showLevelStart: true,
    isSinglePlayer: true,
    difficulty: 'medium',
    difficultyText: '中等',
    score: 0,
    leftJoystick1Active: false,
    leftJoystick1OffsetX: 0,
    leftJoystick1OffsetY: 0,
    rightJoystick1Active: false,
    rightJoystick1OffsetX: 0,
    rightJoystick1OffsetY: 0,
    leftJoystick2Active: false,
    leftJoystick2OffsetX: 0,
    leftJoystick2OffsetY: 0,
    rightJoystick2Active: false,
    rightJoystick2OffsetX: 0,
    rightJoystick2OffsetY: 0,
    showSettings: false,
    joystickSize: 240,
    joystickOpacity: 0.8,
    joystickOpacityPercent: 80
  },

  ctx: null,
  gameLoop: null,
  bullets: [],
  enemies: [],
  playerTanks: [],
  map: [],
  mapData: [],
  currentLevel: 1,
  isRunning: false,
  spawnTimer: 0,
  totalEnemiesSpawned: 0,
  enemiesKilled: 0,
  config: null,
  audioManager: null,
  isMuted: false,
  powerUps: [],
  enemyFreezeTime: 0,
  score: 0,

  leftJoysticks: {},
  rightJoysticks: {},
  fireTouches: {},

  JOYSTICK_MAX_RADIUS: 45,

  onLoad: function() {
    const appData = getApp();
    this.currentLevel = appData.globalData.currentLevel;
    this.setData({
      level: this.currentLevel,
      isSinglePlayer: appData.globalData.isSinglePlayer,
      difficulty: appData.globalData.difficulty,
      difficultyText: this.getDifficultyText(appData.globalData.difficulty)
    });

    this.config = DIFFICULTY_CONFIG[appData.globalData.difficulty];
    this.audioManager = new AudioManager();
    this.audioManager.init();

    if (appData.globalData.isSinglePlayer && this.config.singlePlayerBonus) {
      this.setData({ lives1: 5 });
    }

    this.loadProgress();
    this.loadJoystickSettings();
  },

  onReady: function() {
    this.initGame();
  },

  onHide: function() {
    this.isRunning = false;
    if (this.gameLoop) {
      clearTimeout(this.gameLoop);
    }
    if (this.audioManager) {
      this.audioManager.stopBackgroundMusic();
    }
  },

  onUnload: function() {
    this.isRunning = false;
    if (this.gameLoop) {
      clearTimeout(this.gameLoop);
    }
    for (const key in this.fireTouches) {
      if (this.fireTouches[key]) {
        clearInterval(this.fireTouches[key]);
        delete this.fireTouches[key];
      }
    }
    if (this.audioManager) {
      this.audioManager.destroy();
    }
  },

  getDifficultyText: function(diff) {
    const map = { easy: '简单', medium: '中等', hard: '发狂' };
    return map[diff] || '中等';
  },

  loadProgress: function() {
    try {
      const progress = wx.getStorageSync('gameProgress');
      if (progress) {
        const data = JSON.parse(progress);
        this.score = data.score || 0;
        this.setData({ score: this.score });
      }
    } catch (e) {}
  },

  saveProgress: function() {
    try {
      const progress = {
        score: this.score,
        maxLevel: this.currentLevel,
        timestamp: Date.now()
      };
      wx.setStorageSync('gameProgress', JSON.stringify(progress));
    } catch (e) {}
  },

  initGame: function() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').node((res) => {
      const canvas = res.node;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      const sysInfo = wx.getSystemInfoSync();
      const screenW = sysInfo.windowWidth;
      const screenH = sysInfo.windowHeight;

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      this.loadLevel(this.currentLevel);

      if (this.audioManager) {
        this.audioManager.playBackgroundMusic();
      }

      setTimeout(() => {
        this.setData({ showLevelStart: false });
        this.isRunning = true;
        this.gameLoop = setTimeout(() => this.update(), 16);
      }, 2000);
    }).exec();
  },

  loadLevel: function(levelNum) {
    const levelIdx = Math.min(levelNum - 1, LEVELS.length - 1);
    const levelData = LEVELS[levelIdx];
    this.mapData = JSON.parse(JSON.stringify(levelData.map));
    this.map = this.mapData;

    this.bullets = [];
    this.enemies = [];
    this.playerTanks = [];
    this.powerUps = [];
    this.totalEnemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.spawnTimer = 0;
    this.enemyFreezeTime = 0;

    const spawnY = (MAP_HEIGHT - 3) * TILE_SIZE;

    const p1 = new Tank(2 * TILE_SIZE, spawnY, DIRECTION_UP, true, 1);
    p1.turretAngle = -Math.PI / 2;
    this.playerTanks.push(p1);

    if (!this.data.isSinglePlayer) {
      const p2 = new Tank(4 * TILE_SIZE, spawnY, DIRECTION_UP, true, 2);
      p2.turretAngle = -Math.PI / 2;
      this.playerTanks.push(p2);
    }

    this.spawnEnemyWave();
  },

  spawnEnemyWave: function() {
    if (this.totalEnemiesSpawned >= 20) return;

    const spawnPoints = [
      { x: (MAP_WIDTH - 4) * TILE_SIZE, y: TILE_SIZE },
      { x: (MAP_WIDTH - 6) * TILE_SIZE, y: TILE_SIZE },
      { x: (MAP_WIDTH - 8) * TILE_SIZE, y: TILE_SIZE }
    ];

    const spawn = spawnPoints[this.totalEnemiesSpawned % 3];

    const enemy = new EnemyTank(spawn.x, spawn.y, DIRECTION_DOWN, this.config);
    this.enemies.push(enemy);
    this.totalEnemiesSpawned++;
    if (this.audioManager) {
      this.audioManager.playEnemySpawn();
    }
  },

  update: function() {
    if (!this.isRunning) return;

    const currentTime = Date.now();

    if (!this.data.isPaused && !this.data.gameOver) {
      this.updatePlayerTanks(currentTime);
      this.updateEnemies(currentTime);
      this.updateBullets();
      this.checkCollisions();
      this.updatePowerUps(currentTime);
      this.updateSpawning(currentTime);
      this.checkWinCondition();
      this.render();
    }

    if (this.isRunning) {
      setTimeout(() => this.update(), 16);
    }
  },

  updatePlayerTanks: function(currentTime) {
    for (const tank of this.playerTanks) {
      if (!tank.isAlive) continue;

      tank.isMoving = false;

      const playerId = tank.playerId;
      const leftJoystick = this.leftJoysticks[playerId];
      const rightJoystick = this.rightJoysticks[playerId];

      if (leftJoystick && leftJoystick.active) {
        const angle = Math.atan2(leftJoystick.deltaY, leftJoystick.deltaX);
        const magnitude = Math.min(
          Math.sqrt(leftJoystick.deltaX * leftJoystick.deltaX + leftJoystick.deltaY * leftJoystick.deltaY),
          this.JOYSTICK_MAX_RADIUS
        );

        if (magnitude > 8) {
          tank.isMoving = true;
          const deg = angle * 180 / Math.PI;
          if (deg > -45 && deg <= 45) {
            tank.direction = DIRECTION_RIGHT;
          } else if (deg > 45 && deg <= 135) {
            tank.direction = DIRECTION_DOWN;
          } else if (deg > 135 || deg <= -135) {
            tank.direction = DIRECTION_LEFT;
          } else {
            tank.direction = DIRECTION_UP;
          }
        }
      }

      if (rightJoystick && rightJoystick.active) {
        const angle = Math.atan2(rightJoystick.deltaY, rightJoystick.deltaX);
        tank.turretAngle = angle;
      }

      tank.update(currentTime, this.map, this.playerTanks);
    }
  },

  updateEnemies: function(currentTime) {
    const frozen = this.enemyFreezeTime > currentTime;

    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
        if (frozen) {
          enemy.isMoving = false;
          continue;
        }

        const bullet = enemy.updateAI(currentTime, this.map, this.playerTanks, { x: 12 * TILE_SIZE, y: 24 * TILE_SIZE }, this.enemies);

        if (bullet) {
          this.bullets.push(new Bullet(
            bullet.x, bullet.y, bullet.direction,
            bullet.speed, false, 0, enemy.hasSuperBullet
          ));
        }
      }
    }
  },

  updateBullets: function() {
    for (const bullet of this.bullets) {
      if (bullet.isAlive) {
        bullet.update();
      }
    }
    this.bullets = this.bullets.filter(b => b.isAlive);
  },

  checkCollisions: function() {
    for (const bullet of this.bullets) {
      if (!bullet.isAlive) continue;

      const bHit = bullet.getHitbox();

      for (const enemy of this.enemies) {
        if (!enemy.isAlive) continue;
        const eHit = enemy.getHitbox();

        if (this.intersects(bHit, eHit)) {
          bullet.isAlive = false;
          enemy.isAlive = false;
          this.enemiesKilled++;
          this.score += 100;
          this.updateEnemyCount();
          this.setData({ score: this.score });

          if (enemy.isFlashing) {
            this.spawnPowerUp(enemy.x, enemy.y);
          }

          if (this.audioManager) {
            this.audioManager.playExplosion();
          }
          break;
        }
      }

      if (!bullet.isAlive) continue;

      for (const player of this.playerTanks) {
        if (!player.isAlive || player.isInvincible || player.shieldActive) continue;
        const pHit = player.getHitbox();

        if (this.intersects(bHit, pHit)) {
          bullet.isAlive = false;
          player.isAlive = false;
          this.respawnPlayer(player);
          if (this.audioManager) {
            this.audioManager.playPlayerDie();
          }
          break;
        }
      }

      if (!bullet.isAlive) continue;

      for (const otherBullet of this.bullets) {
        if (otherBullet === bullet || !otherBullet.isAlive) continue;
        if (bullet.isPlayerBullet !== otherBullet.isPlayerBullet) {
          const oHit = otherBullet.getHitbox();
          if (this.intersects(bHit, oHit)) {
            bullet.isAlive = false;
            otherBullet.isAlive = false;
            break;
          }
        }
      }

      if (!bullet.isAlive) continue;

      const tileX = Math.floor(bullet.x / TILE_SIZE);
      const tileY = Math.floor(bullet.y / TILE_SIZE);

      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        const tile = this.map[tileY][tileX];

        if (tile === TILE_BRICK) {
          bullet.isAlive = false;
          if (bullet.isSuper) {
            this.destroyBrickArea(tileX, tileY);
          } else {
            this.map[tileY][tileX] = TILE_EMPTY;
          }
        } else if (tile === TILE_STEEL) {
          bullet.isAlive = false;
          if (bullet.isSuper) {
            this.map[tileY][tileX] = TILE_EMPTY;
          }
        } else if (tile === TILE_BASE) {
          bullet.isAlive = false;
          this.gameOver = true;
          this.setData({ gameOver: true, gameWin: false });
        }
      }
    }

    for (const player of this.playerTanks) {
      if (!player.isAlive) continue;
      const pHit = player.getHitbox();

      for (const powerUp of this.powerUps) {
        if (!powerUp.isAlive) continue;
        const puHit = powerUp.getHitbox();

        if (this.intersects(pHit, puHit)) {
          powerUp.isAlive = false;
          this.applyPowerUp(powerUp.type, player);
        }
      }
    }

    this.powerUps = this.powerUps.filter(p => p.isAlive);
  },

  destroyBrickArea: function(tileX, tileY) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          if (this.map[ny][nx] === TILE_BRICK) {
            this.map[ny][nx] = TILE_EMPTY;
          }
        }
      }
    }
  },

  spawnPowerUp: function(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const puX = Math.max(0, Math.min(x, CANVAS_WIDTH - TILE_SIZE));
    const puY = Math.max(0, Math.min(y, CANVAS_HEIGHT - TILE_SIZE));
    this.powerUps.push(new PowerUp(puX, puY, type));
  },

  applyPowerUp: function(type, player) {
    const currentTime = Date.now();

    switch (type) {
      case POWERUP_CLOCK:
        this.enemyFreezeTime = currentTime + 8000;
        break;
      case POWERUP_GRENADE:
        for (const enemy of this.enemies) {
          if (enemy.isAlive) {
            enemy.isAlive = false;
            this.enemiesKilled++;
            this.score += 100;
          }
        }
        this.updateEnemyCount();
        this.setData({ score: this.score });
        if (this.audioManager) {
          this.audioManager.playExplosion();
        }
        break;
      case POWERUP_HELMET:
        player.shieldActive = true;
        player.shieldTime = currentTime + 10000;
        break;
      case POWERUP_SHOVEL:
        this.fortifyBase(currentTime);
        break;
      case POWERUP_TANK:
        if (player.playerId === 1) {
          const lives = this.data.lives1 + 1;
          this.setData({ lives1: lives });
        } else {
          const lives = this.data.lives2 + 1;
          this.setData({ lives2: lives });
        }
        break;
      case POWERUP_STAR:
        player.starLevel = Math.min(player.starLevel + 1, 3);
        if (player.starLevel >= 1) {
          player.fireRate = 300;
        }
        break;
    }
  },

  fortifyBase: function(currentTime) {
    const baseY = MAP_HEIGHT - 2;
    const baseX = 12;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -2; dx <= 3; dx++) {
        const tx = baseX + dx;
        const ty = baseY + dy;
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
          if (this.map[ty][tx] === TILE_BRICK || this.map[ty][tx] === TILE_EMPTY) {
            this.map[ty][tx] = TILE_STEEL;
          }
        }
      }
    }

    setTimeout(() => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -2; dx <= 3; dx++) {
          const tx = baseX + dx;
          const ty = baseY + dy;
          if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
            if (this.map[ty][tx] === TILE_STEEL) {
              this.map[ty][tx] = TILE_BRICK;
            }
          }
        }
      }
    }, 10000);
  },

  updatePowerUps: function(currentTime) {
    for (const pu of this.powerUps) {
      pu.update(currentTime);
    }
  },

  intersects: function(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  },

  respawnPlayer: function(player) {
    if (player.playerId === 1) {
      const lives = this.data.lives1 - 1;
      this.setData({ lives1: lives });
      if (lives > 0) {
        setTimeout(() => {
          player.x = 2 * TILE_SIZE;
          player.y = (MAP_HEIGHT - 3) * TILE_SIZE;
          player.direction = DIRECTION_UP;
          player.turretAngle = -Math.PI / 2;
          player.isAlive = true;
          player.isInvincible = true;
          player.invincibleTime = Date.now() + 3000;
        }, 1000);
      } else {
        this.checkGameOver();
      }
    } else {
      const lives = this.data.lives2 - 1;
      this.setData({ lives2: lives });
      if (lives > 0) {
        setTimeout(() => {
          player.x = 4 * TILE_SIZE;
          player.y = (MAP_HEIGHT - 3) * TILE_SIZE;
          player.direction = DIRECTION_UP;
          player.turretAngle = -Math.PI / 2;
          player.isAlive = true;
          player.isInvincible = true;
          player.invincibleTime = Date.now() + 3000;
        }, 1000);
      } else {
        this.checkGameOver();
      }
    }
  },

  checkGameOver: function() {
    const allDead = this.playerTanks.every(p => !p.isAlive);
    if (allDead) {
      this.gameOver = true;
      this.setData({ gameOver: true, gameWin: false });
      if (this.audioManager) {
        this.audioManager.playDefeat();
      }
      this.saveProgress();
    }
  },

  updateSpawning: function(currentTime) {
    if (this.totalEnemiesSpawned < 20 && currentTime - this.spawnTimer > this.config.spawnRate) {
      this.spawnEnemyWave();
      this.spawnTimer = currentTime;
    }
  },

  updateEnemyCount: function() {
    const remaining = 20 - this.enemiesKilled;
    this.setData({ enemyCount: remaining });
  },

  checkWinCondition: function() {
    if (this.enemiesKilled >= 20 && this.enemies.every(e => !e.isAlive)) {
      this.gameOver = true;
      this.setData({ gameOver: true, gameWin: true });
      if (this.audioManager) {
        this.audioManager.playVictory();
      }
      this.saveProgress();
    }
  },

  onLeftJoystickStart: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const touch = e.touches[0];
    this.leftJoysticks[playerId] = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      touchId: touch.identifier
    };

    const dataKey = `leftJoystick${playerId}Active`;
    this.setData({ [dataKey]: true });
  },

  onLeftJoystickMove: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const joystick = this.leftJoysticks[playerId];
    if (!joystick || !joystick.active) return;

    for (const touch of e.touches) {
      if (touch.identifier === joystick.touchId) {
        let dx = touch.clientX - joystick.startX;
        let dy = touch.clientY - joystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = this.JOYSTICK_MAX_RADIUS;

        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }

        joystick.deltaX = dx;
        joystick.deltaY = dy;

        const dataX = `leftJoystick${playerId}OffsetX`;
        const dataY = `leftJoystick${playerId}OffsetY`;
        this.setData({ [dataX]: dx, [dataY]: dy });
        break;
      }
    }
  },

  onLeftJoystickEnd: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const joystick = this.leftJoysticks[playerId];
    if (!joystick) return;

    let found = false;
    if (e.changedTouches) {
      for (const touch of e.changedTouches) {
        if (touch.identifier === joystick.touchId) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      for (const touch of (e.touches || [])) {
        if (touch.identifier === joystick.touchId) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      joystick.active = false;
      joystick.deltaX = 0;
      joystick.deltaY = 0;

      const dataActive = `leftJoystick${playerId}Active`;
      const dataX = `leftJoystick${playerId}OffsetX`;
      const dataY = `leftJoystick${playerId}OffsetY`;
      this.setData({ [dataActive]: false, [dataX]: 0, [dataY]: 0 });
    }
  },

  onRightJoystickStart: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const touch = e.touches[0];
    this.rightJoysticks[playerId] = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      touchId: touch.identifier
    };

    const dataKey = `rightJoystick${playerId}Active`;
    this.setData({ [dataKey]: true });
  },

  onRightJoystickMove: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const joystick = this.rightJoysticks[playerId];
    if (!joystick || !joystick.active) return;

    for (const touch of e.touches) {
      if (touch.identifier === joystick.touchId) {
        let dx = touch.clientX - joystick.startX;
        let dy = touch.clientY - joystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = this.JOYSTICK_MAX_RADIUS;

        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }

        joystick.deltaX = dx;
        joystick.deltaY = dy;

        const dataX = `rightJoystick${playerId}OffsetX`;
        const dataY = `rightJoystick${playerId}OffsetY`;
        this.setData({ [dataX]: dx, [dataY]: dy });
        break;
      }
    }
  },

  onRightJoystickEnd: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const joystick = this.rightJoysticks[playerId];
    if (!joystick) return;

    let found = false;
    if (e.changedTouches) {
      for (const touch of e.changedTouches) {
        if (touch.identifier === joystick.touchId) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      for (const touch of (e.touches || [])) {
        if (touch.identifier === joystick.touchId) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      joystick.active = false;
      joystick.deltaX = 0;
      joystick.deltaY = 0;

      const dataActive = `rightJoystick${playerId}Active`;
      const dataX = `rightJoystick${playerId}OffsetX`;
      const dataY = `rightJoystick${playerId}OffsetY`;
      this.setData({ [dataActive]: false, [dataX]: 0, [dataY]: 0 });
    }
  },

  onFireStart: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    const player = this.playerTanks.find(t => t.playerId === playerId);

    if (player && player.isAlive) {
      const bullet = player.fire([], Date.now());
      if (bullet) {
        this.bullets.push(new Bullet(
          bullet.x, bullet.y, bullet.direction,
          bullet.speed, true, playerId, player.hasSuperBullet || player.starLevel >= 3
        ));
        if (this.audioManager) {
          this.audioManager.playShoot();
        }
      }
    }

    this.fireTouches[playerId] = setInterval(() => {
      if (player && player.isAlive) {
        const bullet = player.fire([], Date.now());
        if (bullet) {
          this.bullets.push(new Bullet(
            bullet.x, bullet.y, bullet.direction,
            bullet.speed, true, playerId, player.hasSuperBullet || player.starLevel >= 3
          ));
          if (this.audioManager) {
            this.audioManager.playShoot();
          }
        }
      }
    }, player ? player.fireRate : 500);
  },

  onFireEnd: function(e) {
    const playerId = parseInt(e.currentTarget.dataset.player);
    if (this.fireTouches[playerId]) {
      clearInterval(this.fireTouches[playerId]);
      delete this.fireTouches[playerId];
    }
  },

  togglePause: function() {
    const newPaused = !this.data.isPaused;
    this.setData({ isPaused: newPaused });
    if (this.audioManager) {
      if (newPaused) {
        this.audioManager.pauseBackgroundMusic();
      } else {
        this.audioManager.resumeBackgroundMusic();
      }
    }
  },

  toggleMute: function() {
    if (this.audioManager) {
      const muted = this.audioManager.toggleMute();
      this.setData({ isMuted: muted });
    }
  },

  toggleSettings: function() {
    this.setData({ showSettings: !this.data.showSettings });
  },

  onJoystickSizeChange: function(e) {
    const size = e.detail.value;
    this.setData({ joystickSize: size });
    try {
      wx.setStorageSync('joystickSize', size);
    } catch (err) {}
  },

  onJoystickOpacityChange: function(e) {
    const percent = e.detail.value;
    const opacity = percent / 100;
    this.setData({
      joystickOpacityPercent: percent,
      joystickOpacity: opacity
    });
    try {
      wx.setStorageSync('joystickOpacity', percent);
    } catch (err) {}
  },

  loadJoystickSettings: function() {
    try {
      const size = wx.getStorageSync('joystickSize');
      const opacityPercent = wx.getStorageSync('joystickOpacity');
      if (size) {
        this.setData({ joystickSize: size });
      }
      if (opacityPercent) {
        this.setData({
          joystickOpacityPercent: opacityPercent,
          joystickOpacity: opacityPercent / 100
        });
      }
    } catch (e) {}
  },

  restartLevel: function() {
    for (const key in this.fireTouches) {
      if (this.fireTouches[key]) {
        clearInterval(this.fireTouches[key]);
        delete this.fireTouches[key];
      }
    }

    this.setData({
      gameOver: false,
      gameWin: false,
      isPaused: false,
      lives1: this.data.isSinglePlayer ? (this.config.singlePlayerBonus ? 5 : 3) : 3,
      lives2: this.data.isSinglePlayer ? 0 : 3,
      enemyCount: 20
    });

    this.loadLevel(this.currentLevel);
    this.isRunning = true;
  },

  nextLevel: function() {
    if (this.currentLevel < LEVELS.length) {
      this.currentLevel++;
      this.setData({
        level: this.currentLevel,
        gameOver: false,
        gameWin: false,
        isPaused: false,
        showLevelStart: true,
        lives1: this.data.isSinglePlayer ? (this.config.singlePlayerBonus ? 5 : 3) : 3,
        lives2: this.data.isSinglePlayer ? 0 : 3,
        enemyCount: 20
      });

      this.loadLevel(this.currentLevel);

      setTimeout(() => {
        this.setData({ showLevelStart: false });
        this.isRunning = true;
      }, 2000);
    }
  },

  exitToMenu: function() {
    this.isRunning = false;
    if (this.gameLoop) {
      clearTimeout(this.gameLoop);
    }
    for (const key in this.fireTouches) {
      if (this.fireTouches[key]) {
        clearInterval(this.fireTouches[key]);
        delete this.fireTouches[key];
      }
    }
    this.saveProgress();
    wx.navigateBack();
  },

  render: function() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderMap();
    this.renderPowerUps();
    this.renderEnemies();
    this.renderPlayerTanks();
    this.renderBullets();
    this.renderTreeLayer();
  },

  renderMap: function() {
    const ctx = this.ctx;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.map[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        switch (tile) {
          case TILE_EMPTY:
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            break;
          case TILE_BRICK:
            ctx.fillStyle = '#b55a5a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#8a3a3a';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
            ctx.moveTo(px + TILE_SIZE, py);
            ctx.lineTo(px, py + TILE_SIZE);
            ctx.stroke();
            break;
          case TILE_STEEL:
            ctx.fillStyle = '#888';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#aaa';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2);
            ctx.fillRect(px + TILE_SIZE / 2 + 2, py + 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2);
            ctx.fillRect(px + 2, py + TILE_SIZE / 2 + 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2);
            ctx.fillRect(px + TILE_SIZE / 2 + 2, py + TILE_SIZE / 2 + 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2);
            break;
          case TILE_WATER:
            ctx.fillStyle = '#4a6a8a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#6a8aba';
            const waveOffset = (Date.now() / 500) % TILE_SIZE;
            ctx.fillRect(px + waveOffset - TILE_SIZE, py + 5, TILE_SIZE / 3, 3);
            ctx.fillRect(px + waveOffset % TILE_SIZE, py + 15, TILE_SIZE / 3, 3);
            break;
          case TILE_TREE:
            break;
          case TILE_ICE:
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 3, py + 3, 8, 4);
            ctx.fillRect(px + 14, py + 10, 8, 4);
            break;
          case TILE_BASE:
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(px + 5, py + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(px + 10, py + 2, TILE_SIZE - 20, TILE_SIZE - 4);
            ctx.fillRect(px + 2, py + 10, TILE_SIZE - 4, TILE_SIZE - 20);
            break;
        }
      }
    }
  },

  renderTreeLayer: function() {
    const ctx = this.ctx;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.map[y][x] === TILE_TREE) {
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;
          ctx.fillStyle = '#3a6a3a';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },

  renderTank: function(ctx, tank) {
    if (!tank.isAlive) return;

    const cx = tank.x + tank.width / 2;
    const cy = tank.y + tank.height / 2;

    ctx.save();
    ctx.translate(cx, cy);

    const bodyRotation = (tank.direction * Math.PI) / 2;
    ctx.rotate(bodyRotation);

    let bodyColor, trackColor;
    if (tank.isPlayer) {
      if (tank.playerId === 1) {
        bodyColor = tank.starLevel >= 3 ? '#ffcc00' : tank.starLevel >= 1 ? '#6aaa6a' : '#4a7c4a';
        trackColor = tank.starLevel >= 3 ? '#cc9900' : '#2a5c2a';
      } else {
        bodyColor = tank.starLevel >= 3 ? '#ffcc00' : tank.starLevel >= 1 ? '#6a6aaa' : '#4a4a7c';
        trackColor = tank.starLevel >= 3 ? '#cc9900' : '#2a2a5c';
      }
    } else {
      switch (tank.type) {
        case 'power': bodyColor = '#7c4a4a'; trackColor = '#5a3a3a'; break;
        case 'fast': bodyColor = '#7c7c4a'; trackColor = '#5a5a3a'; break;
        case 'armor': bodyColor = '#6a6a6a'; trackColor = '#4a4a4a'; break;
        default: bodyColor = '#7c4a7c'; trackColor = '#5a3a5a';
      }
    }

    if (tank.isInvincible && Date.now() % 200 < 100) {
      ctx.globalAlpha = 0.5;
    }

    if (tank.isFlashing && Date.now() % 300 < 150) {
      ctx.globalAlpha = 0.6;
    }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);

    ctx.fillStyle = trackColor;
    ctx.fillRect(-tank.width / 2 + 2, -tank.height / 2 + 2, tank.width - 4, tank.height - 4);

    ctx.fillStyle = '#333';
    ctx.fillRect(-3, -tank.height / 2 - 6, 6, tank.height / 2 + 4);

    ctx.fillStyle = '#555';
    ctx.fillRect(-tank.width / 2 + 3, -tank.height / 2 + 3, 4, 4);
    ctx.fillRect(tank.width / 2 - 7, -tank.height / 2 + 3, 4, 4);
    ctx.fillRect(-tank.width / 2 + 3, tank.height / 2 - 7, 4, 4);
    ctx.fillRect(tank.width / 2 - 7, tank.height / 2 - 7, 4, 4);

    ctx.restore();

    if (tank.isPlayer && tank.turretAngle !== undefined) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tank.turretAngle + Math.PI / 2);

      ctx.fillStyle = '#444';
      ctx.fillRect(-2, -tank.height / 2 - 8, 4, tank.height / 2 + 4);

      ctx.restore();
    }

    if (tank.shieldActive) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, tank.width / 2 + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (tank.hasSuperBullet) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(tank.x - 2, tank.y - 2, tank.width + 4, tank.height + 4);
    }
  },

  renderPowerUps: function() {
    const ctx = this.ctx;
    const currentTime = Date.now();

    for (const pu of this.powerUps) {
      if (!pu.isAlive) continue;

      if (Math.floor(currentTime / 200) % 2 === 0) continue;

      const px = pu.x;
      const py = pu.y;

      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(px, py, pu.size, pu.size);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, pu.size - 2, pu.size - 2);

      ctx.fillStyle = '#000';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let symbol = '';
      switch (pu.type) {
        case POWERUP_CLOCK: symbol = 'C'; break;
        case POWERUP_GRENADE: symbol = 'G'; break;
        case POWERUP_HELMET: symbol = 'H'; break;
        case POWERUP_SHOVEL: symbol = 'S'; break;
        case POWERUP_TANK: symbol = 'T'; break;
        case POWERUP_STAR: symbol = '*'; break;
      }
      ctx.fillText(symbol, px + pu.size / 2, py + pu.size / 2);
    }
  },

  renderPlayerTanks: function() {
    for (const tank of this.playerTanks) {
      this.renderTank(this.ctx, tank);
    }
  },

  renderEnemies: function() {
    for (const enemy of this.enemies) {
      this.renderTank(this.ctx, enemy);
    }
  },

  renderBullets: function() {
    const ctx = this.ctx;

    for (const bullet of this.bullets) {
      if (!bullet.isAlive) continue;

      ctx.save();
      ctx.translate(bullet.x, bullet.y);

      ctx.fillStyle = bullet.isSuper ? '#ffff00' : '#ffcc00';
      ctx.fillRect(-bullet.size, -bullet.size, bullet.size * 2, bullet.size * 2);

      ctx.fillStyle = '#fff';
      ctx.fillRect(-bullet.size + 1, -bullet.size + 1, 2, 2);

      ctx.restore();
    }
  }
});
