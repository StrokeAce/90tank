var CONFIG = require('./js/config');
var Renderer = require('./js/renderer');
var SceneManager = require('./js/scene_manager');
var MenuScene = require('./js/scene_menu');
var StageSelectScene = require('./js/scene_stage_select');
var GameScene = require('./js/scene_game');
var GameOverScene = require('./js/scene_gameover');
var Audio = require('./js/audio');
var Storage = require('./js/storage');

var Game = {
  renderer: null,
  sceneManager: null,
  lastTime: 0,
  running: false,
  canvas: null,

  init: function() {
    this.canvas = wx.createCanvas();
    var info = wx.getSystemInfoSync();
    console.log('Screen: ' + info.screenWidth + 'x' + info.screenHeight + ' DPR:' + info.pixelRatio);

    // 设置画布尺寸
    if (this.canvas) {
      // 微信小游戏需要设置画布尺寸
      this.canvas.width = info.screenWidth || 750;
      this.canvas.height = info.screenHeight || 1334;
    }

    this.renderer = new Renderer();
    this.renderer.init(this.canvas);

    this.sceneManager = new SceneManager(this.renderer);

    this.sceneManager.register('menu', new MenuScene(this.renderer, this.sceneManager));
    this.sceneManager.register('stageSelect', new StageSelectScene(this.renderer, this.sceneManager));
    this.sceneManager.register('game', new GameScene(this.renderer, this.sceneManager));
    this.sceneManager.register('gameover', new GameOverScene(this.renderer, this.sceneManager));

    this.sceneManager.changeScene('menu');

    Audio.init();

    this.lastTime = Date.now();
    this.running = true;
    this._loop();
  },

  _loop: function() {
    if (!this.running) return;

    var now = Date.now();
    var dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    dt = Math.min(dt, 0.05);

    this.sceneManager.update(dt);
    this.sceneManager.render();

    var self = this;
    requestAnimationFrame(function() {
      self._loop();
    });
  }
};

Game.init();
