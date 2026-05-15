var CONFIG = require('./config');

var _canvas = null;
var eagleImages = {
  live: null,
  over: null
};

function setCanvas(canvas) {
  _canvas = canvas;
}

function loadImage(src) {
  return new Promise(function(resolve, reject) {
    var img;
    
    if (wx.createImage) {
      img = wx.createImage();
    } else if (_canvas && _canvas.createImage) {
      img = _canvas.createImage();
    } else {
      console.error('❌ 当前环境不支持创建图片对象！');
      reject(new Error('Environment not supported'));
      return;
    }
    
    img.src = src;
    
    img.onload = function() {
      resolve(img);
    };
    
    img.onerror = function(err) {
      console.error('❌ 加载图片失败:', src, err);
      reject(err);
    };
  });
}

function loadEagleImages() {
  var promises = [];
  
  promises.push(loadImage('/prop/eagle_live.png').then(function(img) {
    eagleImages.live = img;
  }).catch(function() {
    console.log('⚠️ 鹰旗存活图片加载失败');
  }));
  
  promises.push(loadImage('/prop/eagle_over.png').then(function(img) {
    eagleImages.over = img;
  }).catch(function() {
    console.log('⚠️ 鹰旗死亡图片加载失败');
  }));
  
  return Promise.all(promises);
}

function getEagleImages() {
  return eagleImages;
}

var Sprites = {
  _cache: null,

  generateAll: function() {
    if (this._cache) return this._cache;

    var sprites = {};

    sprites.player1 = this._generatePlayerTanks(
      CONFIG.COLOR.PLAYER1_BODY,
      CONFIG.COLOR.PLAYER1_TRACK,
      CONFIG.COLOR.PLAYER1_TURRET,
      CONFIG.COLOR.PLAYER1_HIGHLIGHT
    );

    sprites.player2 = this._generatePlayerTanks(
      CONFIG.COLOR.PLAYER2_BODY,
      CONFIG.COLOR.PLAYER2_TRACK,
      CONFIG.COLOR.PLAYER2_TURRET,
      CONFIG.COLOR.PLAYER2_HIGHLIGHT
    );

    sprites.enemies = [];
    sprites.enemies[0] = this._generateEnemyTanks(
      CONFIG.COLOR.ENEMY_BASIC_BODY,
      CONFIG.COLOR.ENEMY_BASIC_TRACK,
      CONFIG.COLOR.ENEMY_BASIC_TURRET
    );
    sprites.enemies[1] = this._generateEnemyTanks(
      CONFIG.COLOR.ENEMY_FAST_BODY,
      CONFIG.COLOR.ENEMY_FAST_TRACK,
      CONFIG.COLOR.ENEMY_FAST_TURRET,
      CONFIG.COLOR.ENEMY_FAST_ACCENT
    );
    sprites.enemies[2] = this._generateEnemyTanks(
      CONFIG.COLOR.ENEMY_POWER_BODY,
      CONFIG.COLOR.ENEMY_POWER_TRACK,
      CONFIG.COLOR.ENEMY_POWER_TURRET
    );
    sprites.enemies[3] = this._generateEnemyTanks(
      CONFIG.COLOR.ENEMY_ARMOR_BODY,
      CONFIG.COLOR.ENEMY_ARMOR_TRACK,
      CONFIG.COLOR.ENEMY_ARMOR_TURRET
    );

    sprites.enemyArmor = [];
    var armorColors = [
      { body: CONFIG.COLOR.ENEMY_ARMOR_BODY, track: CONFIG.COLOR.ENEMY_ARMOR_TRACK, turret: CONFIG.COLOR.ENEMY_ARMOR_TURRET },
      { body: CONFIG.COLOR.ENEMY_ARMOR_DAMAGE1, track: CONFIG.COLOR.ENEMY_ARMOR_TRACK, turret: '#F8D878' },
      { body: CONFIG.COLOR.ENEMY_ARMOR_DAMAGE2, track: '#8B4513', turret: '#F0A050' },
      { body: CONFIG.COLOR.ENEMY_ARMOR_DAMAGE3, track: '#5C0000', turret: '#D88000' }
    ];
    for (var hp = 0; hp < 4; hp++) {
      sprites.enemyArmor[hp] = this._generateEnemyTanks(
        armorColors[hp].body,
        armorColors[hp].track,
        armorColors[hp].turret
      );
    }

    sprites.bullets = this._generateBullets();
    sprites.tiles = this._generateTiles();
    sprites.powerups = this._generatePowerups();
    sprites.explosionSmall = this._generateExplosion(16, 3);
    sprites.explosionLarge = this._generateExplosion(32, 3);
    sprites.spawn = this._generateSpawn();
    sprites.shield = this._generateShield();

    this._cache = sprites;
    return sprites;
  },

  _createSprite: function(w, h, drawFn) {
    return {
      width: w,
      height: h,
      drawFn: drawFn,
      draw: function(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        this.drawFn(ctx, this.width, this.height);
        ctx.restore();
      }
    };
  },

  _generatePlayerTanks: function(bodyColor, trackColor, turretColor, highlightColor) {
    var result = [];
    for (var dir = 0; dir < 4; dir++) {
      result[dir] = [];
      for (var star = 0; star < 4; star++) {
        result[dir][star] = [];
        for (var frame = 0; frame < 2; frame++) {
          result[dir][star][frame] = this._drawTank(16, dir, star, frame, bodyColor, trackColor, turretColor, highlightColor, false);
        }
      }
    }
    return result;
  },

  _generateEnemyTanks: function(bodyColor, trackColor, turretColor, accentColor) {
    var result = [];
    for (var dir = 0; dir < 4; dir++) {
      result[dir] = [];
      for (var frame = 0; frame < 2; frame++) {
        result[dir][frame] = this._drawTank(16, dir, 0, frame, bodyColor, trackColor, turretColor, accentColor || turretColor, true);
      }
    }
    return result;
  },

  _drawTank: function(size, direction, starLevel, frame, bodyColor, trackColor, turretColor, highlightColor, isEnemy) {
    var s = size;
    return this._createSprite(s, s, function(ctx, w, h) {
      var treadOffset = frame % 2;

      if (isEnemy) {
        if (direction === 0) {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, 3, s);
          ctx.fillRect(s - 3, 0, 3, s);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(0, i, 3, 1);
            ctx.fillRect(s - 3, i, 3, 1);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(3, 2, s - 6, s - 4);
          ctx.fillStyle = turretColor;
          ctx.fillRect(Math.floor(s / 2) - 2, 0, 4, Math.floor(s / 2) + 2);
          ctx.fillStyle = highlightColor || turretColor;
          ctx.fillRect(Math.floor(s / 2) - 1, 1, 2, 2);
        } else if (direction === 2) {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, 3, s);
          ctx.fillRect(s - 3, 0, 3, s);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(0, i, 3, 1);
            ctx.fillRect(s - 3, i, 3, 1);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(3, 2, s - 6, s - 4);
          ctx.fillStyle = turretColor;
          ctx.fillRect(Math.floor(s / 2) - 2, Math.floor(s / 2) - 2, 4, Math.floor(s / 2) + 2);
          ctx.fillStyle = highlightColor || turretColor;
          ctx.fillRect(Math.floor(s / 2) - 1, s - 3, 2, 2);
        } else if (direction === 1) {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, s, 3);
          ctx.fillRect(0, s - 3, s, 3);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(i, 0, 1, 3);
            ctx.fillRect(i, s - 3, 1, 3);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(2, 3, s - 4, s - 6);
          ctx.fillStyle = turretColor;
          ctx.fillRect(Math.floor(s / 2) - 2, Math.floor(s / 2) - 2, Math.floor(s / 2) + 2, 4);
          ctx.fillStyle = highlightColor || turretColor;
          ctx.fillRect(s - 3, Math.floor(s / 2) - 1, 2, 2);
        } else {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, s, 3);
          ctx.fillRect(0, s - 3, s, 3);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(i, 0, 1, 3);
            ctx.fillRect(i, s - 3, 1, 3);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(2, 3, s - 4, s - 6);
          ctx.fillStyle = turretColor;
          ctx.fillRect(0, Math.floor(s / 2) - 2, Math.floor(s / 2) + 2, 4);
          ctx.fillStyle = highlightColor || turretColor;
          ctx.fillRect(1, Math.floor(s / 2) - 1, 2, 2);
        }
      } else {
        var redColor = '#FF0000';
        
        if (direction === 0) {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, 3, s);
          ctx.fillRect(s - 3, 0, 3, s);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(0, i, 3, 1);
            ctx.fillRect(s - 3, i, 3, 1);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(3, 2, s - 6, s - 4);
          ctx.fillStyle = turretColor;
          ctx.fillRect(Math.floor(s / 2) - 2, 0, 4, Math.floor(s / 2) + 2);
          
          if (starLevel === 0) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(Math.floor(s / 2) - 1, 1, 2, 2);
          } else if (starLevel === 1) {
            ctx.fillStyle = turretColor;
            ctx.fillRect(7, -4, 2, 7);
            ctx.fillStyle = highlightColor;
            ctx.fillRect(7, -3, 2, 3);
          } else if (starLevel === 2) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(7, 0, 2, 5);
            ctx.fillStyle = redColor;
            ctx.fillRect(7, -5, 2, 5);
          } else {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(6, 0, 4, 5);
            ctx.fillStyle = redColor;
            ctx.fillRect(6, -5, 4, 5);
          }
        } else if (direction === 2) {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, 3, s);
          ctx.fillRect(s - 3, 0, 3, s);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(0, i, 3, 1);
            ctx.fillRect(s - 3, i, 3, 1);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(3, 2, s - 6, s - 4);
          ctx.fillStyle = turretColor;
          ctx.fillRect(Math.floor(s / 2) - 2, Math.floor(s / 2) - 2, 4, Math.floor(s / 2) + 2);
          
          if (starLevel === 0) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(Math.floor(s / 2) - 1, s - 3, 2, 2);
          } else if (starLevel === 1) {
            ctx.fillStyle = turretColor;
            ctx.fillRect(7, 13, 2, 7);
            ctx.fillStyle = highlightColor;
            ctx.fillRect(7, 14, 2, 3);
          } else if (starLevel === 2) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(7, 11, 2, 5);
            ctx.fillStyle = redColor;
            ctx.fillRect(7, 16, 2, 5);
          } else {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(6, 11, 4, 5);
            ctx.fillStyle = redColor;
            ctx.fillRect(6, 16, 4, 5);
          }
        } else if (direction === 1) {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, s, 3);
          ctx.fillRect(0, s - 3, s, 3);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(i, 0, 1, 3);
            ctx.fillRect(i, s - 3, 1, 3);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(2, 3, s - 4, s - 6);
          ctx.fillStyle = turretColor;
          ctx.fillRect(Math.floor(s / 2) - 2, Math.floor(s / 2) - 2, Math.floor(s / 2) + 2, 4);
          
          if (starLevel === 0) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(s - 3, Math.floor(s / 2) - 1, 2, 2);
          } else if (starLevel === 1) {
            ctx.fillStyle = turretColor;
            ctx.fillRect(13, 7, 7, 2);
            ctx.fillStyle = highlightColor;
            ctx.fillRect(14, 7, 3, 2);
          } else if (starLevel === 2) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(11, 7, 5, 2);
            ctx.fillStyle = redColor;
            ctx.fillRect(16, 7, 5, 2);
          } else {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(11, 6, 5, 4);
            ctx.fillStyle = redColor;
            ctx.fillRect(16, 6, 5, 4);
          }
        } else {
          ctx.fillStyle = trackColor;
          ctx.fillRect(0, 0, s, 3);
          ctx.fillRect(0, s - 3, s, 3);
          for (var i = 0; i < s; i += 2) {
            ctx.fillStyle = (i + treadOffset) % 4 < 2 ? trackColor : bodyColor;
            ctx.fillRect(i, 0, 1, 3);
            ctx.fillRect(i, s - 3, 1, 3);
          }
          ctx.fillStyle = bodyColor;
          ctx.fillRect(2, 3, s - 4, s - 6);
          ctx.fillStyle = turretColor;
          ctx.fillRect(0, Math.floor(s / 2) - 2, Math.floor(s / 2) + 2, 4);
          
          if (starLevel === 0) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(1, Math.floor(s / 2) - 1, 2, 2);
          } else if (starLevel === 1) {
            ctx.fillStyle = turretColor;
            ctx.fillRect(-4, 7, 7, 2);
            ctx.fillStyle = highlightColor;
            ctx.fillRect(-3, 7, 3, 2);
          } else if (starLevel === 2) {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(-2, 7, 5, 2);
            ctx.fillStyle = redColor;
            ctx.fillRect(-7, 7, 5, 2);
          } else {
            ctx.fillStyle = highlightColor;
            ctx.fillRect(-2, 6, 5, 4);
            ctx.fillStyle = redColor;
            ctx.fillRect(-7, 6, 5, 4);
          }
        }
      }

      if (isEnemy && highlightColor) {
        ctx.fillStyle = highlightColor;
        if (direction === 0 || direction === 2) {
          ctx.fillRect(4, Math.floor(s / 2) - 1, 2, 2);
          ctx.fillRect(s - 6, Math.floor(s / 2) - 1, 2, 2);
        } else {
          ctx.fillRect(Math.floor(s / 2) - 1, 4, 2, 2);
          ctx.fillRect(Math.floor(s / 2) - 1, s - 6, 2, 2);
        }
      }
    });
  },

  _generateBullets: function() {
    var bullets = [];
    var dirs = [
      [{ x: 1, y: 0, w: 2, h: 4 }],
      [{ x: 0, y: 1, w: 4, h: 2 }],
      [{ x: 1, y: 0, w: 2, h: 4 }],
      [{ x: 0, y: 1, w: 4, h: 2 }]
    ];
    for (var d = 0; d < 4; d++) {
      bullets[d] = this._createSprite(4, 4, (function(dirIdx) {
        return function(ctx, w, h) {
          ctx.fillStyle = CONFIG.COLOR.BULLET_COLOR;
          var r = dirs[dirIdx][0];
          ctx.fillRect(r.x, r.y, r.w, r.h);
        };
      })(d));
    }
    return bullets;
  },

  _generateTiles: function() {
    var tiles = {};

    tiles.brick = this._createSprite(16, 16, function(ctx, w, h) {
      ctx.fillStyle = CONFIG.COLOR.BRICK_DARK;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = CONFIG.COLOR.BRICK_LIGHT;
      ctx.fillRect(0, 0, 8, 4);
      ctx.fillRect(0, 4, 4, 4);
      ctx.fillRect(8, 4, 8, 4);
      ctx.fillRect(0, 8, 8, 4);
      ctx.fillRect(4, 12, 8, 4);
      ctx.fillRect(0, 12, 4, 4);
      ctx.fillRect(12, 12, 4, 4);
      ctx.fillStyle = CONFIG.COLOR.BRICK_MID;
      ctx.fillRect(0, 0, 8, 1);
      ctx.fillRect(8, 4, 8, 1);
      ctx.fillRect(0, 8, 8, 1);
      ctx.fillRect(4, 12, 8, 1);
    });

    tiles.steel = this._createSprite(16, 16, function(ctx, w, h) {
      ctx.fillStyle = CONFIG.COLOR.STEEL_DARK;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = CONFIG.COLOR.STEEL_MID;
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = CONFIG.COLOR.STEEL_LIGHT;
      ctx.fillRect(2, 2, 6, 6);
      ctx.fillRect(9, 2, 5, 3);
      ctx.fillRect(2, 9, 5, 5);
      ctx.fillRect(9, 9, 5, 5);
      ctx.fillStyle = CONFIG.COLOR.STEEL_DARK;
      ctx.fillRect(8, 1, 1, 14);
      ctx.fillRect(1, 8, 14, 1);
    });

    tiles.forest = this._createSprite(16, 16, function(ctx, w, h) {
      ctx.fillStyle = CONFIG.COLOR.FOREST_DARK;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = CONFIG.COLOR.FOREST_MID;
      for (var y = 0; y < 16; y += 4) {
        for (var x = 0; x < 16; x += 4) {
          ctx.fillRect(x + ((y / 4) % 2) * 2, y, 3, 3);
        }
      }
      ctx.fillStyle = CONFIG.COLOR.FOREST_LIGHT;
      ctx.fillRect(1, 1, 2, 2);
      ctx.fillRect(9, 5, 2, 2);
      ctx.fillRect(5, 9, 2, 2);
      ctx.fillRect(13, 13, 2, 2);
    });

    tiles.water = [];
    for (var f = 0; f < 2; f++) {
      tiles.water[f] = this._createSprite(16, 16, (function(frame) {
        return function(ctx, w, h) {
          ctx.fillStyle = CONFIG.COLOR.WATER_DARK;
          ctx.fillRect(0, 0, 16, 16);
          ctx.fillStyle = CONFIG.COLOR.WATER_MID;
          for (var y = 0; y < 16; y += 4) {
            var offset = (y / 4 + frame) % 2 === 0 ? 0 : 2;
            for (var x = 0; x < 16; x += 4) {
              ctx.fillRect(x + offset, y, 3, 2);
            }
          }
          ctx.fillStyle = CONFIG.COLOR.WATER_LIGHT;
          ctx.fillRect(2 + frame, 1, 2, 1);
          ctx.fillRect(10 + frame, 5, 2, 1);
          ctx.fillRect(6 + frame, 9, 2, 1);
          ctx.fillRect(14 + frame, 13, 2, 1);
        };
      })(f));
    }

    tiles.ice = this._createSprite(16, 16, function(ctx, w, h) {
      ctx.fillStyle = '#B0F0FF';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = CONFIG.COLOR.ICE_LIGHT;
      for (var y = 0; y < 16; y += 4) {
        for (var x = 0; x < 16; x += 4) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(1, 1, 1, 1);
      ctx.fillRect(5, 5, 1, 1);
      ctx.fillRect(9, 9, 1, 1);
      ctx.fillRect(13, 13, 1, 1);
    });

    tiles.eagle = { type: 'image', key: 'live' };
    tiles.eagleDead = { type: 'image', key: 'over' };

    return tiles;
  },

  _generatePowerups: function() {
    var powerups = [];
    var symbols = [
      { bg: CONFIG.COLOR.POWERUP_CLOCK_COLOR, shape: 'clock' },
      { bg: CONFIG.COLOR.POWERUP_GRENADE_COLOR, shape: 'grenade' },
      { bg: CONFIG.COLOR.POWERUP_HELMET_COLOR, shape: 'helmet' },
      { bg: CONFIG.COLOR.POWERUP_SHOVEL_COLOR, shape: 'shovel' },
      { bg: CONFIG.COLOR.POWERUP_TANK_COLOR, shape: 'tank' },
      { bg: CONFIG.COLOR.POWERUP_STAR_COLOR, shape: 'star' }
    ];

    for (var t = 0; t < 6; t++) {
      powerups[t] = [];
      for (var f = 0; f < 2; f++) {
        powerups[t][f] = this._createSprite(16, 16, (function(type, frame) {
          return function(ctx, w, h) {
            var sym = symbols[type];
            var alpha = frame === 0 ? 1.0 : 0.6;
            ctx.fillStyle = CONFIG.COLOR.POWERUP_BG;
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = frame === 0 ? CONFIG.COLOR.POWERUP_BORDER : '#8B4513';
            ctx.fillRect(0, 0, 16, 2);
            ctx.fillRect(0, 14, 16, 2);
            ctx.fillRect(0, 0, 2, 16);
            ctx.fillRect(14, 0, 2, 16);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = sym.bg;
            switch (sym.shape) {
              case 'clock':
                ctx.fillRect(5, 3, 6, 10);
                ctx.fillRect(7, 5, 2, 4);
                ctx.fillStyle = '#000000';
                ctx.fillRect(7, 6, 1, 2);
                break;
              case 'grenade':
                ctx.fillRect(5, 4, 6, 8);
                ctx.fillRect(7, 2, 2, 3);
                ctx.fillStyle = '#FCFCFC';
                ctx.fillRect(6, 5, 4, 2);
                break;
              case 'helmet':
                ctx.fillRect(4, 5, 8, 7);
                ctx.fillRect(5, 3, 6, 3);
                ctx.fillStyle = '#000000';
                ctx.fillRect(6, 6, 4, 2);
                break;
              case 'shovel':
                ctx.fillRect(6, 3, 4, 6);
                ctx.fillRect(4, 9, 8, 4);
                ctx.fillStyle = '#000000';
                ctx.fillRect(7, 4, 2, 4);
                break;
              case 'tank':
                ctx.fillRect(4, 5, 8, 6);
                ctx.fillRect(7, 3, 2, 3);
                ctx.fillStyle = '#000000';
                ctx.fillRect(5, 6, 6, 4);
                break;
              case 'star':
                ctx.fillRect(6, 3, 4, 3);
                ctx.fillRect(4, 6, 8, 3);
                ctx.fillRect(5, 9, 2, 3);
                ctx.fillRect(9, 9, 2, 3);
                ctx.fillRect(7, 9, 2, 4);
                break;
            }
            ctx.globalAlpha = 1.0;
          };
        })(t, f));
      }
    }
    return powerups;
  },

  _generateExplosion: function(size, frames) {
    var result = [];
    var colors = [
      CONFIG.COLOR.EXPLOSION_CENTER,
      CONFIG.COLOR.EXPLOSION_MID,
      CONFIG.COLOR.EXPLOSION_OUTER,
      CONFIG.COLOR.EXPLOSION_EDGE
    ];
    for (var f = 0; f < frames; f++) {
      result[f] = this._createSprite(size, size, (function(frame, sz) {
        return function(ctx, w, h) {
          var cx = sz / 2;
          var cy = sz / 2;
          var maxR = sz / 2;
          var progress = (frame + 1) / frames;
          var r = maxR * progress;

          for (var ring = 3; ring >= 0; ring--) {
            var ringR = r * (ring + 1) / 4;
            ctx.fillStyle = colors[ring];
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.fill();
          }
        };
      })(f, size));
    }
    return result;
  },

  _generateSpawn: function() {
    var result = [];
    for (var f = 0; f < 4; f++) {
      result[f] = this._createSprite(16, 16, (function(frame) {
        return function(ctx, w, h) {
          var cx = 8;
          var cy = 8;
          var show = frame % 2 === 0;
          if (show) {
            ctx.fillStyle = CONFIG.COLOR.SPAWN_FLASH_COLOR;
            for (var i = 0; i < 4; i++) {
              var angle = (i * Math.PI / 2) + (frame * Math.PI / 4);
              var x1 = cx + Math.cos(angle) * 3;
              var y1 = cy + Math.sin(angle) * 3;
              var x2 = cx + Math.cos(angle) * 7;
              var y2 = cy + Math.sin(angle) * 7;
              ctx.fillRect(Math.floor(x1) - 1, Math.floor(y1) - 1, 3, 3);
              ctx.fillRect(Math.floor(x2) - 1, Math.floor(y2) - 1, 2, 2);
            }
            ctx.fillRect(cx - 2, cy - 2, 4, 4);
          } else {
            ctx.fillStyle = '#BCBCBC';
            for (var i = 0; i < 4; i++) {
              var angle = (i * Math.PI / 2) + (frame * Math.PI / 4);
              var x1 = cx + Math.cos(angle) * 4;
              var y1 = cy + Math.sin(angle) * 4;
              ctx.fillRect(Math.floor(x1) - 1, Math.floor(y1) - 1, 2, 2);
            }
          }
        };
      })(f));
    }
    return result;
  },

  _generateShield: function() {
    var result = [];
    for (var f = 0; f < 2; f++) {
      result[f] = this._createSprite(16, 16, (function(frame) {
        return function(ctx, w, h) {
          ctx.strokeStyle = frame === 0 ? CONFIG.COLOR.SHIELD_COLOR : CONFIG.COLOR.SHIELD_FLASH;
          ctx.lineWidth = 1;
          var cx = 8;
          var cy = 8;
          var r = 7;
          var sides = 6;
          var startAngle = frame * Math.PI / 6;
          ctx.beginPath();
          for (var i = 0; i <= sides; i++) {
            var angle = startAngle + (i * 2 * Math.PI / sides);
            var x = cx + r * Math.cos(angle);
            var y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
      })(f));
    }
    return result;
  }
};

module.exports = Sprites;
module.exports.setCanvas = setCanvas;
module.exports.loadEagleImages = loadEagleImages;
module.exports.getEagleImages = getEagleImages;
