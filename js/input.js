var CONFIG = require('./config');
var Utils = require('./utils');

function VirtualJoystick(id, centerX, centerY, radius, options) {
  this.id = id;
  this.centerX = centerX;
  this.centerY = centerY;
  this.radius = radius || CONFIG.INPUT.JOYSTICK_RADIUS;
  this.innerRadius = options.innerRadius || CONFIG.INPUT.JOYSTICK_INNER_RADIUS;
  this.deadZone = options.deadZone || CONFIG.INPUT.JOYSTICK_DEAD_ZONE;
  this.opacity = options.opacity || CONFIG.INPUT.JOYSTICK_OPACITY;
  this.activeOpacity = options.activeOpacity || CONFIG.INPUT.JOYSTICK_ACTIVE_OPACITY;

  this.touchId = null;
  this.active = false;
  this.dx = 0;
  this.dy = 0;
  this.knobX = centerX;
  this.knobY = centerY;
  this.angle = 0;
  this.magnitude = 0;
}

VirtualJoystick.prototype.handleTouchStart = function(touchX, touchY, touchId) {
  var dist = Utils.distance(touchX, touchY, this.centerX, this.centerY);
  if (dist <= this.radius * 1.5) {
    this.touchId = touchId;
    this.active = true;
    this._updatePosition(touchX, touchY);
    return true;
  }
  return false;
};

VirtualJoystick.prototype.handleTouchMove = function(touchX, touchY, touchId) {
  if (this.touchId !== touchId) return false;
  this._updatePosition(touchX, touchY);
  return true;
};

VirtualJoystick.prototype.handleTouchEnd = function(touchId) {
  if (this.touchId !== touchId) return false;
  this.touchId = null;
  this.active = false;
  this.dx = 0;
  this.dy = 0;
  this.knobX = this.centerX;
  this.knobY = this.centerY;
  this.magnitude = 0;
}

VirtualJoystick.prototype._updatePosition = function(touchX, touchY) {
  this.dx = touchX - this.centerX;
  this.dy = touchY - this.centerY;
  var dist = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

  if (dist > this.radius) {
    this.dx = this.dx / dist * this.radius;
    this.dy = this.dy / dist * this.radius;
    dist = this.radius;
  }

  this.magnitude = dist / this.radius;
  this.angle = Math.atan2(this.dy, this.dx);

  if (this.magnitude < this.deadZone) {
    this.magnitude = 0;
    this.dx = 0;
    this.dy = 0;
  }

  this.knobX = this.centerX + this.dx;
  this.knobY = this.centerY + this.dy;
};

VirtualJoystick.prototype.getDirection = function() {
  if (this.magnitude <= 0) return -1;
  return Utils.angleToDirection(this.angle);
};

VirtualJoystick.prototype.getMoveVector = function() {
  return { dx: this.dx / this.radius, dy: this.dy / this.radius, magnitude: this.magnitude };
};

VirtualJoystick.prototype.render = function(ctx) {
  var alpha = this.active ? this.activeOpacity : this.opacity;

  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = this.active ? '#FFFF00' : '#CCCCCC';
  ctx.beginPath();
  ctx.arc(this.knobX, this.knobY, this.innerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(this.knobX, this.knobY, this.innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1.0;
};

function FireButton(id, centerX, centerY, radius, options) {
  this.id = id;
  this.centerX = centerX;
  this.centerY = centerY;
  this.radius = radius || CONFIG.INPUT.FIRE_BUTTON_RADIUS;
  this.opacity = options.opacity || CONFIG.INPUT.FIRE_BUTTON_OPACITY;
  this.activeOpacity = options.activeOpacity || CONFIG.INPUT.FIRE_BUTTON_ACTIVE_OPACITY;

  this.touchId = null;
  this.pressed = false;
  this.pressTime = 0;
  this.autoFire = options.autoFire || false;
  this.autoFireInterval = CONFIG.INPUT.AUTO_FIRE_INTERVAL;
  this.lastFireTime = 0;
}

FireButton.prototype.handleTouchStart = function(touchX, touchY, touchId) {
  var dist = Utils.distance(touchX, touchY, this.centerX, this.centerY);
  if (dist <= this.radius * 1.3) {
    this.touchId = touchId;
    this.pressed = true;
    this.pressTime = Date.now();
    this.lastFireTime = 0;
    return true;
  }
  return false;
};

FireButton.prototype.handleTouchEnd = function(touchId) {
  if (this.touchId !== touchId) return false;
  this.touchId = null;
  this.pressed = false;
  this.pressTime = 0;
  return true;
};

FireButton.prototype.shouldFire = function() {
  if (!this.pressed) return false;

  var now = Date.now();
  if (this.lastFireTime === 0) {
    this.lastFireTime = now;
    return true;
  }

  if (this.autoFire && (now - this.pressTime > CONFIG.INPUT.AUTO_FIRE_THRESHOLD)) {
    if (now - this.lastFireTime >= this.autoFireInterval) {
      this.lastFireTime = now;
      return true;
    }
  }
  return false;
};

FireButton.prototype.render = function(ctx) {
  var alpha = this.pressed ? this.activeOpacity : this.opacity;

  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FF6666';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.floor(this.radius * 0.7) + 'px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIRE', this.centerX, this.centerY);

  ctx.globalAlpha = 1.0;
};

function InputManager() {
  this.leftStick = null;
  this.rightStick = null;
  this.fireButton = null;
  this.pauseButton = null;

  this.player2LeftStick = null;
  this.player2RightStick = null;
  this.player2FireButton = null;

  this.twoPlayer = false;
  this.scaleX = 1;
  this.scaleY = 1;
  this.offsetX = 0;
  this.offsetY = 0;

  this._paused = false;
  this._pauseCallback = null;

  this.settings = {
    joystickSize: 1.0,
    joystickOpacity: 0.35,
    autoFire: false
  };
}

InputManager.prototype.init = function(screenWidth, screenHeight, twoPlayer) {
  this.twoPlayer = twoPlayer || false;
  this._calculateLayout(screenWidth, screenHeight);
  this._createControls();
};

InputManager.prototype._calculateLayout = function(sw, sh) {
  var gameW = CONFIG.SCREEN.WIDTH;
  var gameH = CONFIG.SCREEN.HEIGHT;
  this.scaleX = sw / gameW;
  this.scaleY = sh / gameH;
  this.offsetX = 0;
  this.offsetY = 0;

  var sizeMultiplier = this.settings.joystickSize;
  var stickRadius = CONFIG.INPUT.JOYSTICK_RADIUS * sizeMultiplier;
  var fireRadius = CONFIG.INPUT.FIRE_BUTTON_RADIUS * sizeMultiplier;

  var margin = 60;
  var bottomMargin = 50;

  if (!this.twoPlayer) {
    this.leftStick = new VirtualJoystick('p1_left', margin + stickRadius, sh - bottomMargin - stickRadius, stickRadius, {
      opacity: this.settings.joystickOpacity,
      deadZone: CONFIG.INPUT.JOYSTICK_DEAD_ZONE
    });

    this.fireButton = new FireButton('p1_fire', sw - margin - fireRadius, sh - bottomMargin - fireRadius, fireRadius, {
      opacity: CONFIG.INPUT.FIRE_BUTTON_OPACITY,
      autoFire: this.settings.autoFire
    });

    this.pauseButton = {
      x: sw - 40,
      y: 15,
      w: 30,
      h: 20,
      touchId: null
    };
  } else {
    var halfW = sw / 2;

    this.leftStick = new VirtualJoystick('p1_left', margin + stickRadius, sh - bottomMargin - stickRadius, stickRadius * 0.85, {
      opacity: this.settings.joystickOpacity,
      deadZone: CONFIG.INPUT.JOYSTICK_DEAD_ZONE
    });
    this.rightStick = new VirtualJoystick('p1_right', halfW - margin - stickRadius * 2 - fireRadius * 2, sh - bottomMargin - stickRadius, stickRadius * 0.85, {
      opacity: this.settings.joystickOpacity,
      deadZone: CONFIG.INPUT.JOYSTICK_DEAD_ZONE
    });
    this.fireButton = new FireButton('p1_fire', halfW - margin - fireRadius, sh - bottomMargin - fireRadius, fireRadius * 0.85, {
      opacity: CONFIG.INPUT.FIRE_BUTTON_OPACITY,
      autoFire: this.settings.autoFire
    });

    this.player2LeftStick = new VirtualJoystick('p2_left', halfW + margin + stickRadius, sh - bottomMargin - stickRadius, stickRadius * 0.85, {
      opacity: this.settings.joystickOpacity,
      deadZone: CONFIG.INPUT.JOYSTICK_DEAD_ZONE
    });
    this.player2RightStick = new VirtualJoystick('p2_right', sw - margin - stickRadius * 2 - fireRadius * 2 - 20, sh - bottomMargin - stickRadius, stickRadius * 0.85, {
      opacity: this.settings.joystickOpacity,
      deadZone: CONFIG.INPUT.JOYSTICK_DEAD_ZONE
    });
    this.player2FireButton = new FireButton('p2_fire', sw - margin - fireRadius, sh - bottomMargin - fireRadius, fireRadius * 0.85, {
      opacity: CONFIG.INPUT.FIRE_BUTTON_OPACITY,
      autoFire: this.settings.autoFire
    });

    this.pauseButton = {
      x: sw / 2 - 15,
      y: 5,
      w: 30,
      h: 20,
      touchId: null
    };
  }
};

InputManager.prototype._createControls = function() {};

InputManager.prototype._bindEvents = function() {
  var self = this;

  try {
    wx.offTouchStart();
    wx.offTouchMove();
    wx.offTouchEnd();
    wx.offTouchCancel();

    wx.onTouchStart(function(e) {
      var touches = e.touches;
      for (var i = 0; i < touches.length; i++) {
        self._handleTouchStart(touches[i]);
      }
    });

    wx.onTouchMove(function(e) {
      var touches = e.touches;
      for (var i = 0; i < touches.length; i++) {
        self._handleTouchMove(touches[i]);
      }
    });

    wx.onTouchEnd(function(e) {
      var changedTouches = e.changedTouches;
      for (var i = 0; i < changedTouches.length; i++) {
        self._handleTouchEnd(changedTouches[i]);
      }
    });

    wx.onTouchCancel(function(e) {
      var changedTouches = e.changedTouches;
      for (var i = 0; i < changedTouches.length; i++) {
        self._handleTouchEnd(changedTouches[i]);
      }
    });
  } catch (e) {}
};

InputManager.prototype._handleTouchStart = function(touch) {
  var tx = touch.clientX;
  var ty = touch.clientY;
  var tid = touch.identifier;

  if (this._checkPauseButton(tx, ty)) {
    this._paused = !this._paused;
    if (this._pauseCallback) this._pauseCallback(this._paused);
    return;
  }

  if (this.leftStick && this.leftStick.handleTouchStart(tx, ty, tid)) return;
  if (this.rightStick && this.rightStick.handleTouchStart(tx, ty, tid)) return;
  if (this.fireButton && this.fireButton.handleTouchStart(tx, ty, tid)) return;

  if (this.twoPlayer) {
    if (this.player2LeftStick && this.player2LeftStick.handleTouchStart(tx, ty, tid)) return;
    if (this.player2RightStick && this.player2RightStick.handleTouchStart(tx, ty, tid)) return;
    if (this.player2FireButton && this.player2FireButton.handleTouchStart(tx, ty, tid)) return;
  }
};

InputManager.prototype._handleTouchMove = function(touch) {
  var tx = touch.clientX;
  var ty = touch.clientY;
  var tid = touch.identifier;

  if (this.leftStick) this.leftStick.handleTouchMove(tx, ty, tid);
  if (this.rightStick) this.rightStick.handleTouchMove(tx, ty, tid);

  if (this.twoPlayer) {
    if (this.player2LeftStick) this.player2LeftStick.handleTouchMove(tx, ty, tid);
    if (this.player2RightStick) this.player2RightStick.handleTouchMove(tx, ty, tid);
  }
};

InputManager.prototype._handleTouchEnd = function(touch) {
  var tid = touch.identifier;

  if (this.leftStick) this.leftStick.handleTouchEnd(tid);
  if (this.rightStick) this.rightStick.handleTouchEnd(tid);
  if (this.fireButton) this.fireButton.handleTouchEnd(tid);

  if (this.twoPlayer) {
    if (this.player2LeftStick) this.player2LeftStick.handleTouchEnd(tid);
    if (this.player2RightStick) this.player2RightStick.handleTouchEnd(tid);
    if (this.player2FireButton) this.player2FireButton.handleTouchEnd(tid);
  }
};

InputManager.prototype._checkPauseButton = function(tx, ty) {
  var pb = this.pauseButton;
  if (!pb) return false;
  return tx >= pb.x && tx <= pb.x + pb.w && ty >= pb.y && ty <= pb.y + pb.h;
};

InputManager.prototype.getPlayer1Input = function() {
  var moveDir = -1;
  var aimDir = -1;
  var fire = false;

  if (this.leftStick && this.leftStick.active) {
    moveDir = this.leftStick.getDirection();
  }

  if (this.rightStick && this.rightStick.active) {
    aimDir = this.rightStick.getDirection();
  }

  if (this.fireButton) {
    fire = this.fireButton.shouldFire();
  }

  if (aimDir >= 0) {
    moveDir = aimDir;
  }

  return {
    moveDirection: moveDir,
    fire: fire,
    moveVector: this.leftStick ? this.leftStick.getMoveVector() : { dx: 0, dy: 0, magnitude: 0 }
  };
};

InputManager.prototype.getPlayer2Input = function() {
  if (!this.twoPlayer) return null;

  var moveDir = -1;
  var aimDir = -1;
  var fire = false;

  if (this.player2LeftStick && this.player2LeftStick.active) {
    moveDir = this.player2LeftStick.getDirection();
  }

  if (this.player2RightStick && this.player2RightStick.active) {
    aimDir = this.player2RightStick.getDirection();
  }

  if (this.player2FireButton) {
    fire = this.player2FireButton.shouldFire();
  }

  if (aimDir >= 0) {
    moveDir = aimDir;
  }

  return {
    moveDirection: moveDir,
    fire: fire,
    moveVector: this.player2LeftStick ? this.player2LeftStick.getMoveVector() : { dx: 0, dy: 0, magnitude: 0 }
  };
};

InputManager.prototype.isPaused = function() {
  return this._paused;
};

InputManager.prototype.setPauseCallback = function(cb) {
  this._pauseCallback = cb;
};

InputManager.prototype.render = function(ctx) {
  if (this.leftStick) this.leftStick.render(ctx);
  if (this.rightStick) this.rightStick.render(ctx);
  if (this.fireButton) this.fireButton.render(ctx);

  if (this.twoPlayer) {
    if (this.player2LeftStick) this.player2LeftStick.render(ctx);
    if (this.player2RightStick) this.player2RightStick.render(ctx);
    if (this.player2FireButton) this.player2FireButton.render(ctx);
  }

  this._renderPauseButton(ctx);
};

InputManager.prototype._renderPauseButton = function(ctx) {
  if (!this.pauseButton) return;
  var pb = this.pauseButton;
  ctx.globalAlpha = CONFIG.INPUT.PAUSE_BUTTON_OPACITY;
  ctx.fillStyle = '#666666';
  ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(pb.x + 8, pb.y + 3, 4, pb.h - 6);
  ctx.fillRect(pb.x + 18, pb.y + 3, 4, pb.h - 6);
  ctx.globalAlpha = 1.0;
};

InputManager.prototype.updateSettings = function(settings) {
  this.settings = settings;
};

InputManager.prototype.relayout = function(screenWidth, screenHeight) {
  this._calculateLayout(screenWidth, screenHeight);
};

module.exports = InputManager;
