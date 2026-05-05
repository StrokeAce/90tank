var CONFIG = require('./config');

// 小程序兼容层
var miniProgramCanvasFactory = null;

function setMiniProgramCanvasFactory(factory) {
  miniProgramCanvasFactory = factory;
}

function clamp(val, min, max) {
  return val < min ? min : (val > max ? max : val);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function pixelToGrid(px, py) {
  return {
    col: Math.floor(px / CONFIG.TILE.CELL_SIZE_SCALED),
    row: Math.floor(py / CONFIG.TILE.CELL_SIZE_SCALED)
  };
}

function gridToPixel(col, row) {
  return {
    x: col * CONFIG.TILE.CELL_SIZE_SCALED,
    y: row * CONFIG.TILE.CELL_SIZE_SCALED
  };
}

function snapToGrid(val) {
  return Math.round(val / CONFIG.TILE.CELL_SIZE_SCALED) * CONFIG.TILE.CELL_SIZE_SCALED;
}

function directionFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? CONFIG.DIRECTION.RIGHT : CONFIG.DIRECTION.LEFT;
  }
  return dy > 0 ? CONFIG.DIRECTION.DOWN : CONFIG.DIRECTION.UP;
}

function angleToDirection(angle) {
  var deg = ((angle * 180 / Math.PI) + 360) % 360;
  if (deg >= 315 || deg < 45) return CONFIG.DIRECTION.UP;
  if (deg >= 45 && deg < 135) return CONFIG.DIRECTION.RIGHT;
  if (deg >= 135 && deg < 225) return CONFIG.DIRECTION.DOWN;
  return CONFIG.DIRECTION.LEFT;
}

function createCanvas(w, h) {
  if (miniProgramCanvasFactory) {
    return miniProgramCanvasFactory(w, h);
  }
  try {
    var canvas = wx.createCanvas();
    canvas.width = w;
    canvas.height = h;
    return canvas;
  } catch (e) {
    return {
      width: w,
      height: h,
      _ctx: {
        fillStyle: '#000',
        save: function(){},
        restore: function(){},
        scale: function(){},
        translate: function(){},
        fillRect: function(){},
        drawImage: function(){},
        beginPath: function(){},
        arc: function(){},
        fill: function(){},
        stroke: function(){},
        lineWidth: 1,
        strokeStyle: '#000',
        globalAlpha: 1,
        font: '12px monospace',
        textAlign: 'left',
        textBaseline: 'top'
      },
      getContext: function() {
        return this._ctx;
      }
    };
  }
}

function drawPixelArray(ctx, data, palette, scale) {
  for (var y = 0; y < data.length; y++) {
    for (var x = 0; x < data[y].length; x++) {
      var idx = data[y][x];
      if (idx === 0) continue;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

function formatScore(score) {
  var s = String(score);
  while (s.length < 6) s = '0' + s;
  return s;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  clamp: clamp,
  lerp: lerp,
  randomInt: randomInt,
  randomFloat: randomFloat,
  distance: distance,
  rectOverlap: rectOverlap,
  pixelToGrid: pixelToGrid,
  gridToPixel: gridToPixel,
  snapToGrid: snapToGrid,
  directionFromVector: directionFromVector,
  angleToDirection: angleToDirection,
  createCanvas: createCanvas,
  drawPixelArray: drawPixelArray,
  formatScore: formatScore,
  deepCopy: deepCopy,
  setMiniProgramCanvasFactory: setMiniProgramCanvasFactory
};
