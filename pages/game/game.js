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
  constructor(x, y, direction, isPlayer, playerId = 1) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.isPlayer = isPlayer;
    this.playerId = playerId;
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
    this.moveHistory = [];
    this.lastMoveTime = 0;
    this.fastMove = false;
  }

  update(currentTime, map, tanks) {
    if (!this.isAlive) return;

    if (this.isInvincible && currentTime > this.invincibleTime) {
      this.isInvincible = false;
    }

    if (this.hasSuperBullet && currentTime > this.superBulletTime) {
      this.hasSuperBullet = false;
    }

    if (this.isMoving) {
      const speed = this.fastMove ? this.speed * 1.5 : this.speed;
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

      if (this.isPlayer) {
        const historyKey = `${this.direction}-${Math.floor(currentTime / 100)}`;
        if (this.moveHistory[this.moveHistory.length - 1] === historyKey) {
          if (currentTime - this.lastMoveTime < 200) {
            this.fastMove = true;
          }
        } else {
          this.moveHistory.push(historyKey);
          if (this.moveHistory.length > 5) this.moveHistory.shift();
        }
        this.lastMoveTime = currentTime;
      }
    }

    this.fastMove = false;
  }

  checkCollision(x, y, map, tanks) {
    const left = x;
    const right = x + this.width;
    const top = y;
    const bottom = y + this.height;

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

    switch (this.direction) {
      case DIRECTION_UP: bulletY = this.y - 4; break;
      case DIRECTION_DOWN: bulletY = this.y + this.height + 4; break;
      case DIRECTION_LEFT: bulletX = this.x - 4; break;
      case DIRECTION_RIGHT: bulletX = this.x + this.width + 4; break;
    }

    return {
      x: bulletX,
      y: bulletY,
      direction: this.direction,
      speed: 5,
      isPlayerBullet: this.isPlayer,
      playerId: this.playerId,
      isSuper: this.hasSuperBullet
    };
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
  constructor(x, y, direction, speed, isPlayerBullet, playerId, isSuper = false) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.isPlayerBullet = isPlayerBullet;
    this.playerId = playerId;
    this.isSuper = isSuper;
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

class EnemyTank extends Tank {
  constructor(x, y, direction, config) {
    super(x, y, direction, false);
    this.speed = config.enemySpeed;
    this.fireRate = config.enemyFireRate;
    this.bulletSpeed = config.enemyBulletSpeed;
    this.aiState = 'patrol';
    this.patrolDir = Math.floor(Math.random() * 4);
    this.patrolTime = 0;
    this.thinkTime = 0;
    this.targetDirection = direction;
    this.isInBase = false;
    this.type = ['basic', 'fast', 'power'][Math.floor(Math.random() * 3)];
    this.lastFireTime = 0;
    this.fireInterval = 1000;
  }

  updateAI(currentTime, map, playerTanks, basePos, allEnemies) {
    if (!this.isAlive) return;

    this.update(currentTime, map, []);

    let bullet = null;
    if (currentTime - this.lastFireTime >= this.fireInterval) {
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
    const speed = this.type === 'fast' ? this.speed * 1.3 : this.speed;

    switch (this.direction) {
      case DIRECTION_UP: newY -= speed; break;
      case DIRECTION_DOWN: newY += speed; break;
      case DIRECTION_LEFT: newX -= speed; break;
      case DIRECTION_RIGHT: newX += speed; break;
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

  shouldFire(playerTanks, map) {
    for (const player of playerTanks) {
      if (!player.isAlive) continue;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        if ((this.direction === DIRECTION_UP && dy < 0) ||
            (this.direction === DIRECTION_DOWN && dy > 0) ||
            (this.direction === DIRECTION_LEFT && dx < 0) ||
            (this.direction === DIRECTION_RIGHT && dx > 0)) {
          const bullet = this.fire([], Date.now());
          if (bullet) {
            bullet.speed = this.bulletSpeed;
            return true;
          }
        } else {
          this.direction = this.getDirectionToTarget(player);
          return true;
        }
      }
    }
    return false;
  }

  getDirectionToTarget(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;
    } else {
      return dy > 0 ? DIRECTION_DOWN : DIRECTION_UP;
    }
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

  findBestDirection(map, playerTanks, basePos) {
    const directions = [DIRECTION_UP, DIRECTION_DOWN, DIRECTION_LEFT, DIRECTION_RIGHT];
    let bestDir = directions[Math.floor(Math.random() * 4)];
    let bestScore = -Infinity;

    for (const dir of directions) {
      let score = 0;
      let testX = this.x;
      let testY = this.y;

      for (let i = 0; i < 5; i++) {
        switch (dir) {
          case DIRECTION_UP: testY -= this.speed; break;
          case DIRECTION_DOWN: testY += this.speed; break;
          case DIRECTION_LEFT: testX -= this.speed; break;
          case DIRECTION_RIGHT: testX += this.speed; break;
        }
      }

      const tileX = Math.floor(testX / TILE_SIZE);
      const tileY = Math.floor(testY / TILE_SIZE);

      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        const tile = map[tileY][tileX];
        if (tile !== TILE_BRICK && tile !== TILE_STEEL && tile !== TILE_WATER) {
          score += 10;
        }
      }

      for (const player of playerTanks) {
        if (player.isAlive) {
          const dx = player.x - testX;
          const dy = player.y - testY;
          score -= Math.sqrt(dx * dx + dy * dy) * 0.01;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
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
    difficultyText: '中等'
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
  joystickActive: false,
  joystickTouchId: null,
  joystickStartX: 0,
  joystickStartY: 0,
  joystickDeltaX: 0,
  joystickDeltaY: 0,
  fireTouches: {},
  audioManager: null,
  isMuted: false,

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
  },

  onReady: function() {
    this.initGame();
  },

  onShow: function() {
    if (this.ctx && this.isRunning) {
    }
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

  getDifficultyText: function(diff) {
    const map = { easy: '简单', medium: '中等', hard: '发狂' };
    return map[diff] || '中等';
  },

  initGame: function() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').node((res) => {
      const canvas = res.node;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

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
    const levelData = LEVELS[levelNum - 1];
    this.mapData = JSON.parse(JSON.stringify(levelData.map));
    this.map = this.mapData;

    this.bullets = [];
    this.enemies = [];
    this.playerTanks = [];
    this.totalEnemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.spawnTimer = 0;

    const spawnY = (MAP_HEIGHT - 3) * TILE_SIZE;

    const p1 = new Tank(2 * TILE_SIZE, spawnY, DIRECTION_UP, true, 1);
    this.playerTanks.push(p1);

    if (!this.data.isSinglePlayer) {
      const p2 = new Tank(4 * TILE_SIZE, spawnY, DIRECTION_UP, true, 2);
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

      if (tank.playerId === 1 && this.joystickActive) {
        const angle = Math.atan2(this.joystickDeltaY, this.joystickDeltaX);
        const magnitude = Math.min(Math.sqrt(this.joystickDeltaX * this.joystickDeltaX + this.joystickDeltaY * this.joystickDeltaY), 50);

        if (magnitude > 10) {
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

      tank.update(currentTime, this.map, this.playerTanks);
    }
  },

  updateEnemies: function(currentTime) {
    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
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
          this.updateEnemyCount();
          if (this.audioManager) {
            this.audioManager.playExplosion();
          }
          break;
        }
      }

      if (!bullet.isAlive) continue;

      for (const player of this.playerTanks) {
        if (!player.isAlive || player.isInvincible) continue;
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

      const tileX = Math.floor(bullet.x / TILE_SIZE);
      const tileY = Math.floor(bullet.y / TILE_SIZE);

      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        const tile = this.map[tileY][tileX];

        if (tile === TILE_BRICK) {
          bullet.isAlive = false;
          if (bullet.isSuper) {
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
    }
  },

  render: function() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderMap();
    this.renderEnemies();
    this.renderPlayerTanks();
    this.renderBullets();
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
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            break;
          case TILE_BRICK:
            ctx.fillStyle = '#b55a5a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#8a3a3a';
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
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#3a6a3a';
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case TILE_ICE:
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 3, py + 3, 8, 4);
            ctx.fillRect(px + 14, py + 10, 8, 4);
            break;
          case TILE_BASE:
            ctx.fillStyle = '#2a2a2a';
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

  renderTank: function(ctx, tank) {
    if (!tank.isAlive) return;

    const cx = tank.x + tank.width / 2;
    const cy = tank.y + tank.height / 2;

    ctx.save();
    ctx.translate(cx, cy);

    const rotation = (tank.direction * Math.PI) / 2;
    ctx.rotate(rotation);

    const color = tank.isPlayer ? 
      (tank.playerId === 1 ? '#4a7c4a' : '#4a4a7c') : 
      (tank.type === 'power' ? '#7c4a4a' : tank.type === 'fast' ? '#7c7c4a' : '#7c4a7c');

    if (tank.isInvincible && Date.now() % 200 < 100) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = color;
    ctx.fillRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);

    ctx.fillStyle = tank.isPlayer ? '#2a5c2a' : '#5a3a3a';
    ctx.fillRect(-tank.width / 2 + 2, -tank.height / 2 + 2, tank.width - 4, tank.height - 4);

    ctx.fillStyle = '#333';
    ctx.fillRect(-3, -tank.height / 2 - 6, 6, tank.height / 2 + 4);

    ctx.fillStyle = '#555';
    ctx.fillRect(-tank.width / 2 + 3, -tank.height / 2 + 3, 4, 4);
    ctx.fillRect(tank.width / 2 - 7, -tank.height / 2 + 3, 4, 4);
    ctx.fillRect(-tank.width / 2 + 3, tank.height / 2 - 7, 4, 4);
    ctx.fillRect(tank.width / 2 - 7, tank.height / 2 - 7, 4, 4);

    ctx.restore();

    if (tank.hasSuperBullet) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(tank.x - 2, tank.y - 2, tank.width + 4, tank.height + 4);
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
  },

  onTouchStart: function(e) {
    const touches = e.touches;

    for (const touch of touches) {
      if (touch.clientX < 150 && touch.clientY > 300) {
        this.joystickActive = true;
        this.joystickTouchId = touch.id;
        this.joystickStartX = touch.clientX;
        this.joystickStartY = touch.clientY;
        this.joystickDeltaX = 0;
        this.joystickDeltaY = 0;
      }
    }
  },

  onTouchMove: function(e) {
    const touches = e.touches;

    for (const touch of touches) {
      if (touch.id === this.joystickTouchId) {
        this.joystickDeltaX = touch.clientX - this.joystickStartX;
        this.joystickDeltaY = touch.clientY - this.joystickStartY;

        const maxDist = 50;
        const dist = Math.sqrt(this.joystickDeltaX * this.joystickDeltaX + this.joystickDeltaY * this.joystickDeltaY);

        if (dist > maxDist) {
          this.joystickDeltaX = (this.joystickDeltaX / dist) * maxDist;
          this.joystickDeltaY = (this.joystickDeltaY / dist) * maxDist;
        }
      }
    }
  },

  onTouchEnd: function(e) {
    const touches = e.touches;

    let found = false;
    for (const touch of touches) {
      if (touch.id === this.joystickTouchId) {
        found = true;
        break;
      }
    }

    if (!found) {
      this.joystickActive = false;
      this.joystickTouchId = null;
      this.joystickDeltaX = 0;
      this.joystickDeltaY = 0;
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
          bullet.speed, true, playerId, player.hasSuperBullet
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
            bullet.speed, true, playerId, player.hasSuperBullet
          ));
          if (this.audioManager) {
            this.audioManager.playShoot();
          }
        }
      }
    }, 300);
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

  restartLevel: function() {
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
    if (this.currentLevel < 10) {
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
    wx.navigateBack();
  }
});