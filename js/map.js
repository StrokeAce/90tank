var CONFIG = require('./config');
var Utils = require('./utils');
var Sprites = require('./sprites');

function GameMap() {
  this.terrain = null;
  this.cols = CONFIG.TILE.GRID_COLS;
  this.rows = CONFIG.TILE.GRID_ROWS;
  this.cellSize = CONFIG.TILE.CELL_SIZE_SCALED;
  this.tileSize = CONFIG.TILE.TILE_SIZE_SCALED;
  this.eagleAlive = true;
  this.eagleRow = 24;
  this.eagleCol = 21; // 鹰旗宽度2格(24px)，右移一格避免覆盖右墙
  this.waterFrame = 0;
  this.waterFrameTimer = 0;
  this.waterFrameInterval = 400;
  this._sprites = null;
}

GameMap.prototype.loadLevel = function(levelData) {
  this.terrain = levelData.terrain;
  this.eagleAlive = true;
  this._sprites = Sprites.generateAll();
};

GameMap.prototype.update = function(dt) {
  this.waterFrameTimer += dt * 1000;
  if (this.waterFrameTimer >= this.waterFrameInterval) {
    this.waterFrameTimer = 0;
    this.waterFrame = (this.waterFrame + 1) % 2;
  }
};

GameMap.prototype.render = function(ctx) {
  if (!this.terrain) return;

  for (var row = 0; row < this.rows; row++) {
    if (!this.terrain[row]) continue;
    for (var col = 0; col < this.cols; col++) {
      if (this.terrain[row][col] === undefined) continue;
      var type = this.terrain[row][col];
      var x = col * this.cellSize;
      var y = row * this.cellSize;

      switch (type) {
        case CONFIG.TILE_TYPE.BRICK:
          this._renderTile(ctx, this._sprites.tiles.brick, x, y);
          break;
        case CONFIG.TILE_TYPE.STEEL:
          this._renderTile(ctx, this._sprites.tiles.steel, x, y);
          break;
        case CONFIG.TILE_TYPE.FOREST:
          break;
        case CONFIG.TILE_TYPE.WATER:
          this._renderTile(ctx, this._sprites.tiles.water[this.waterFrame], x, y);
          break;
        case CONFIG.TILE_TYPE.ICE:
          this._renderTile(ctx, this._sprites.tiles.ice, x, y);
          break;
      }
    }
  }

  this._renderEagle(ctx);
  this._renderGrid(ctx);
};

GameMap.prototype._renderGrid = function(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  
  for (var row = 0; row <= this.rows; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * this.cellSize);
    ctx.lineTo(this.cols * this.cellSize, row * this.cellSize);
    ctx.stroke();
  }
  
  for (var col = 0; col <= this.cols; col++) {
    ctx.beginPath();
    ctx.moveTo(col * this.cellSize, 0);
    ctx.lineTo(col * this.cellSize, this.rows * this.cellSize);
    ctx.stroke();
  }
  
  ctx.restore();
};

GameMap.prototype.renderForest = function(ctx) {
  if (!this.terrain) return;
  for (var row = 0; row < this.rows; row++) {
    if (!this.terrain[row]) continue;
    for (var col = 0; col < this.cols; col++) {
      if (this.terrain[row][col] === undefined) continue;
      if (this.terrain[row][col] === CONFIG.TILE_TYPE.FOREST) {
        var x = col * this.cellSize;
        var y = row * this.cellSize;
        this._renderTile(ctx, this._sprites.tiles.forest, x, y);
      }
    }
  }
};

GameMap.prototype._renderTile = function(ctx, sprite, x, y) {
  if (sprite) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.tileSize / sprite.width, this.tileSize / sprite.height);
    sprite.drawFn(ctx, sprite.width, sprite.height);
    ctx.restore();
  }
};

GameMap.prototype._renderEagle = function(ctx) {
  var ex = this.eagleCol * this.cellSize;
  var ey = this.eagleRow * this.cellSize;
  var sprite = this.eagleAlive ? this._sprites.tiles.eagle : this._sprites.tiles.eagleDead;
  if (sprite) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale((this.tileSize * 2) / sprite.width, (this.tileSize * 2) / sprite.height);
    sprite.drawFn(ctx, sprite.width, sprite.height);
    ctx.restore();
  }
};

GameMap.prototype.getTileAt = function(col, row) {
  if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
    return CONFIG.TILE_TYPE.STEEL;
  }
  if (!this.terrain || !this.terrain[row]) {
    return CONFIG.TILE_TYPE.STEEL;
  }
  return this.terrain[row][col];
};

GameMap.prototype.setTileAt = function(col, row, type) {
  if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
  this.terrain[row][col] = type;
};

GameMap.prototype.destroyTile = function(col, row) {
  if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
  var type = this.terrain[row][col];
  if (type === CONFIG.TILE_TYPE.BRICK || 
      type === CONFIG.TILE_TYPE.FOREST || 
      type === CONFIG.TILE_TYPE.WATER) {
    this.terrain[row][col] = CONFIG.TILE_TYPE.EMPTY;
  }
};

GameMap.prototype.destroySteelTile = function(col, row) {
  if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
  var type = this.terrain[row][col];
  if (type === CONFIG.TILE_TYPE.STEEL) {
    this.terrain[row][col] = CONFIG.TILE_TYPE.EMPTY;
  }
};

GameMap.prototype.checkTankCollision = function(x, y, w, h, excludeTank) {
  var mapW = CONFIG.TILE.MAP_WIDTH_SCALED;
  var mapH = CONFIG.TILE.MAP_HEIGHT_SCALED;

  if (x < 0 || y < 0 || x + w > mapW || y + h > mapH) {
    return true;
  }

  var startCol = Math.floor(x / this.cellSize);
  var endCol = Math.floor((x + w - 1) / this.cellSize);
  var startRow = Math.floor(y / this.cellSize);
  var endRow = Math.floor((y + h - 1) / this.cellSize);

  for (var row = startRow; row <= endRow; row++) {
    for (var col = startCol; col <= endCol; col++) {
      var tile = this.getTileAt(col, row);
      if (tile === CONFIG.TILE_TYPE.BRICK || tile === CONFIG.TILE_TYPE.STEEL ||
          tile === CONFIG.TILE_TYPE.WATER || tile === CONFIG.TILE_TYPE.EAGLE ||
          tile === CONFIG.TILE_TYPE.EAGLE_DEAD) {
        return true;
      }
    }
  }

  return false;
};

GameMap.prototype.checkBulletCollision = function(bullet) {
  if (!bullet.alive) return null;

  var bx = bullet.x;
  var by = bullet.y;
  var bw = bullet.width;
  var bh = bullet.height;

  var startCol = Math.floor(bx / this.cellSize);
  var endCol = Math.floor((bx + bw) / this.cellSize);
  var startRow = Math.floor(by / this.cellSize);
  var endRow = Math.floor((by + bh) / this.cellSize);

  var hitTiles = [];

  for (var row = startRow; row <= endRow; row++) {
    for (var col = startCol; col <= endCol; col++) {
      var tile = this.getTileAt(col, row);
      if (tile === CONFIG.TILE_TYPE.BRICK) {
        hitTiles.push({ col: col, row: row, type: 'brick' });
      } else if (tile === CONFIG.TILE_TYPE.STEEL) {
        hitTiles.push({ col: col, row: row, type: 'steel' });
      } else if (tile === CONFIG.TILE_TYPE.EAGLE) {
        hitTiles.push({ col: col, row: row, type: 'eagle' });
      } else if (tile === CONFIG.TILE_TYPE.FOREST) {
        if (bullet.canPierceForest) {
          hitTiles.push({ col: col, row: row, type: 'forest' });
          console.log('Forest will be destroyed, bullet.canPierceForest:', bullet.canPierceForest);
        }
      } else if (tile === CONFIG.TILE_TYPE.WATER) {
        if (bullet.canPierceWater) {
          hitTiles.push({ col: col, row: row, type: 'water' });
          console.log('Water will be destroyed, bullet.canPierceWater:', bullet.canPierceWater);
        }
      }
    }
  }

  if (hitTiles.length === 0) return null;

  var result = { tiles: hitTiles, hitEagle: false };

  for (var i = 0; i < hitTiles.length; i++) {
    var ht = hitTiles[i];
    if (ht.type === 'brick') {
      this.destroyTile(ht.col, ht.row);
    } else if (ht.type === 'steel') {
      if (bullet.canPierceSteel) {
        this.destroySteelTile(ht.col, ht.row);
      }
    } else if (ht.type === 'eagle') {
      result.hitEagle = true;
      this.eagleAlive = false;
      this.setTileAt(ht.col, ht.row, CONFIG.TILE_TYPE.EAGLE_DEAD);
    } else if (ht.type === 'forest') {
      this.destroyTile(ht.col, ht.row);
    } else if (ht.type === 'water') {
      this.destroyTile(ht.col, ht.row);
    }
  }

  if (hitTiles.some(function(t) { return t.type === 'brick'; }) ||
      hitTiles.some(function(t) { return t.type === 'eagle'; }) ||
      (bullet.canPierceSteel && hitTiles.some(function(t) { return t.type === 'steel'; })) ||
      (bullet.canPierceForest && hitTiles.some(function(t) { return t.type === 'forest'; })) ||
      (bullet.canPierceWater && hitTiles.some(function(t) { return t.type === 'water'; }))) {
    result.destroyed = true;
  }

  if (hitTiles.some(function(t) { return t.type === 'steel'; }) && !bullet.canPierceSteel) {
    result.destroyed = false;
    result.bounced = true;
  }

  return result;
};

GameMap.prototype.isIceAt = function(x, y, w, h) {
  var startCol = Math.floor(x / this.cellSize);
  var endCol = Math.floor((x + w - 1) / this.cellSize);
  var startRow = Math.floor(y / this.cellSize);
  var endRow = Math.floor((y + h - 1) / this.cellSize);

  for (var row = startRow; row <= endRow; row++) {
    for (var col = startCol; col <= endCol; col++) {
      if (this.getTileAt(col, row) === CONFIG.TILE_TYPE.ICE) {
        return true;
      }
    }
  }
  return false;
};

GameMap.prototype.fortifyBase = function(useSteel) {
  var eagleCol = this.eagleCol;
  var eagleRow = this.eagleRow;
  var tileType = useSteel ? CONFIG.TILE_TYPE.STEEL : CONFIG.TILE_TYPE.BRICK;

  var positions = [
    { col: eagleCol - 1, row: eagleRow - 1 },
    { col: eagleCol, row: eagleRow - 1 },
    { col: eagleCol + 1, row: eagleRow - 1 },
    { col: eagleCol + 2, row: eagleRow - 1 },
    { col: eagleCol - 1, row: eagleRow },
    { col: eagleCol + 2, row: eagleRow },
    { col: eagleCol - 1, row: eagleRow + 1 },
    { col: eagleCol, row: eagleRow + 1 },
    { col: eagleCol + 1, row: eagleRow + 1 },
    { col: eagleCol + 2, row: eagleRow + 1 }
  ];

  for (var i = 0; i < positions.length; i++) {
    var p = positions[i];
    if (p.col >= 0 && p.col < this.cols && p.row >= 0 && p.row < this.rows) {
      this.setTileAt(p.col, p.row, tileType);
    }
  }
};

module.exports = GameMap;
