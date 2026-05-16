var Entity = require('./entity');
var CONFIG = require('./config');
var Audio = require('./audio');
var Sprites = require('./sprites');

var _sprites = null;
function getSprites() {
  if (!_sprites) _sprites = Sprites.generateAll();
  return _sprites;
}

var powerupIcons = {};
var _canvas = null;

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

function loadPowerupIcons() {
  var icons = {
    0: '/prop/alam.png',
    1: '/prop/bomb.png',
    2: '/prop/helmet.png',
    3: '/prop/shovel.png',
    4: '/prop/tank.png',
    5: '/prop/star.png',
    6: '/prop/gun.png'
  };
  
  var promises = [];
  var types = Object.keys(icons);
  
  types.forEach(function(type) {
    var path = icons[type];
    promises.push(loadImage(path).then(function(img) {
      powerupIcons[type] = img;
    }).catch(function() {
      console.log('⚠️ 道具图标加载失败:', path);
    }));
  });
  
  return Promise.all(promises);
}

module.exports.setCanvas = setCanvas;
module.exports.loadPowerupIcons = loadPowerupIcons;

function PowerUp(x, y, type) {
  Entity.call(this, x, y, CONFIG.TANK.SIZE_SCALED, CONFIG.TANK.SIZE_SCALED);
  this.type = type;
  this.frameTimer = 0;
  this.frame = 0;
  this.flashInterval = 200;
  this.lifetime = 0;
  this.maxLifetime = 15000;
}

PowerUp.prototype = Object.create(Entity.prototype);
PowerUp.prototype.constructor = PowerUp;

PowerUp.prototype.update = function(dt) {
  if (!this.alive) return;

  this.frameTimer += dt * 1000;
  if (this.frameTimer >= this.flashInterval) {
    this.frameTimer = 0;
    this.frame = (this.frame + 1) % 2;
  }

  this.lifetime += dt * 1000;
  if (this.lifetime >= this.maxLifetime) {
    this.alive = false;
  }
};

PowerUp.prototype.render = function(ctx) {
  if (!this.alive) return;
  
  ctx.save();
  
  var alpha = this.frame === 0 ? 1.0 : 0.5;
  ctx.globalAlpha = alpha;
  
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
  
  var icon = powerupIcons[this.type];
  if (icon) {
    var scale = Math.min(this.width / icon.width, this.height / icon.height);
    var drawWidth = icon.width * scale;
    var drawHeight = icon.height * scale;
    var offsetX = (this.width - drawWidth) / 2;
    var offsetY = (this.height - drawHeight) / 2;
    ctx.drawImage(icon, this.x + offsetX, this.y + offsetY, drawWidth, drawHeight);
    ctx.restore();
    return;
  }
  
  var sprites = getSprites();
  if (this.type < sprites.powerups.length && sprites.powerups[this.type][this.frame]) {
    var sprite = sprites.powerups[this.type][this.frame];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.width / sprite.width, this.height / sprite.height);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  }
  
  ctx.restore();
};

PowerUp.prototype.collect = function(player) {
  this.alive = false;

  switch (this.type) {
    case CONFIG.POWERUP_TYPE.CLOCK.ID:
      Audio.playEatProp();
      return { effect: 'freeze', duration: CONFIG.GAME.FREEZE_DURATION };
    case CONFIG.POWERUP_TYPE.GRENADE.ID:
      Audio.playEatProp();
      return { effect: 'grenade' };
    case CONFIG.POWERUP_TYPE.HELMET.ID:
      Audio.playEatProp();
      return { effect: 'shield', duration: CONFIG.GAME.SHIELD_DURATION };
    case CONFIG.POWERUP_TYPE.SHOVEL.ID:
      Audio.playEatProp();
      return { effect: 'shovel', duration: CONFIG.GAME.BASE_STEEL_DURATION };
    case CONFIG.POWERUP_TYPE.TANK.ID:
      Audio.playMoreLife();
      return { effect: 'extraLife' };
    case CONFIG.POWERUP_TYPE.STAR.ID:
      Audio.playEatProp();
      return { effect: 'upgrade' };
    case CONFIG.POWERUP_TYPE.GUN.ID:
      Audio.playEatProp();
      return { effect: 'gun', duration: CONFIG.POWERUP_TYPE.GUN.DURATION, upgradeAmount: 2 };
  }
  return null;
};

module.exports = PowerUp;
module.exports.setCanvas = setCanvas;
module.exports.loadPowerupIcons = loadPowerupIcons;
