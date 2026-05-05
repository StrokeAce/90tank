var CONFIG = require('./config');

function SceneManager(renderer) {
  this.renderer = renderer;
  this.currentScene = null;
  this.scenes = {};
  this.transitioning = false;
}

SceneManager.prototype.register = function(name, scene) {
  this.scenes[name] = scene;
};

SceneManager.prototype.changeScene = function(name, data) {
  if (this.transitioning) return;

  this.transitioning = true;

  if (this.currentScene && this.currentScene.exit) {
    this.currentScene.exit();
  }

  var newScene = this.scenes[name];
  if (newScene) {
    this.currentScene = newScene;
    if (this.currentScene.enter) {
      this.currentScene.enter(data);
    }
  }

  this.transitioning = false;
};

SceneManager.prototype.update = function(dt) {
  if (this.currentScene && this.currentScene.update) {
    this.currentScene.update(dt);
  }
};

SceneManager.prototype.render = function() {
  if (this.currentScene && this.currentScene.render) {
    this.currentScene.render();
  }
};

SceneManager.prototype.getCurrentScene = function() {
  return this.currentScene;
};

module.exports = SceneManager;
