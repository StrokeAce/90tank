var CONFIG = require('./config');
var Utils = require('./utils');

function Entity(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.width = w;
  this.height = h;
  this.alive = true;
  this.active = true;
}

Entity.prototype.update = function(dt) {};

Entity.prototype.render = function(ctx) {};

Entity.prototype.getRect = function() {
  return {
    x: this.x,
    y: this.y,
    w: this.width,
    h: this.height
  };
};

Entity.prototype.collidesWith = function(other) {
  return Utils.rectOverlap(
    this.x, this.y, this.width, this.height,
    other.x, other.y, other.width, other.height
  );
};

Entity.prototype.destroy = function() {
  this.alive = false;
  this.active = false;
};

Entity.prototype.centerX = function() {
  return this.x + this.width / 2;
};

Entity.prototype.centerY = function() {
  return this.y + this.height / 2;
};

module.exports = Entity;
