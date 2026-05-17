var CONFIG = require('./js/config')
var Renderer = require('./js/renderer')
var SceneManager = require('./js/scene_manager')
var MenuScene = require('./js/scene_menu')
var StageSelectScene = require('./js/scene_stage_select')
var GameScene = require('./js/scene_game')
var GameOverScene = require('./js/scene_gameover')
var SettingsScene = require('./js/scene_settings')
var Audio = require('./js/audio')
var PowerUp = require('./js/powerup')
var Sprites = require('./js/sprites')

var canvas = null
var ctx = null
var renderer = null
var sceneManager = null
var lastTime = 0
var running = false
var screenInfo = null

screenInfo = wx.getSystemInfoSync()

function initCanvas() {
  canvas = wx.createCanvas()

  var width = screenInfo.screenWidth
  var height = screenInfo.screenHeight
  var dpr = screenInfo.pixelRatio

  canvas.width = width * dpr
  canvas.height = height * dpr

  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  canvas.savedWidth = width
  canvas.savedHeight = height
}

function bindTouchEvents() {
  wx.onTouchStart(function (e) {
    if (!sceneManager) return
    var scene = sceneManager.getCurrentScene()
    if (!scene) return

    if (scene.input) {
      var touches = e.touches
      for (var i = 0; i < touches.length; i++) {
        var t = touches[i]
        scene.input._handleTouchStart({
          clientX: t.clientX,
          clientY: t.clientY,
          identifier: t.identifier
        })
      }
    } else if (scene.handleTouchStart) {
      scene.handleTouchStart({
        touches: e.touches.map(function (t) {
          return {
            clientX: t.clientX,
            clientY: t.clientY,
            identifier: t.identifier
          }
        })
      })
    }
  })

  wx.onTouchMove(function (e) {
    if (!sceneManager) return
    var scene = sceneManager.getCurrentScene()
    if (!scene) return

    if (scene.input) {
      var touches = e.touches
      for (var i = 0; i < touches.length; i++) {
        var t = touches[i]
        scene.input._handleTouchMove({
          clientX: t.clientX,
          clientY: t.clientY,
          identifier: t.identifier
        })
      }
    }
  })

  wx.onTouchEnd(function (e) {
    if (!sceneManager) return
    var scene = sceneManager.getCurrentScene()
    if (!scene) return

    if (scene.input) {
      var changedTouches = e.changedTouches
      for (var i = 0; i < changedTouches.length; i++) {
        var t = changedTouches[i]
        scene.input._handleTouchEnd({
          clientX: t.clientX,
          clientY: t.clientY,
          identifier: t.identifier
        })
      }
    } else if (scene.handleTouchEnd) {
      scene.handleTouchEnd({
        changedTouches: e.changedTouches.map(function (t) {
          return {
            clientX: t.clientX,
            clientY: t.clientY,
            identifier: t.identifier
          }
        })
      })
    }
  })

  wx.onTouchCancel(function (e) {
    if (!sceneManager) return
    var scene = sceneManager.getCurrentScene()
    if (!scene) return

    if (scene.input) {
      var changedTouches = e.changedTouches
      for (var i = 0; i < changedTouches.length; i++) {
        var t = changedTouches[i]
        scene.input._handleTouchEnd({
          clientX: t.clientX,
          clientY: t.clientY,
          identifier: t.identifier
        })
      }
    }
  })
}

async function startGame() {
  try {
    PowerUp.setCanvas(canvas)
    Sprites.setCanvas(canvas)

    console.log('等待道具图标加载...')
    await PowerUp.loadPowerupIcons().catch(function () {
      console.log('部分道具图标加载失败，将使用默认图标')
    })

    console.log('等待鹰旗图片加载...')
    await Sprites.loadEagleImages().catch(function () {
      console.log('鹰旗图片加载失败，将使用默认绘制')
    })

    renderer = new Renderer()
    renderer.init(canvas)

    sceneManager = new SceneManager(renderer)

    sceneManager.register('menu', new MenuScene(renderer, sceneManager))
    sceneManager.register('stageSelect', new StageSelectScene(renderer, sceneManager))
    sceneManager.register('game', new GameScene(renderer, sceneManager))
    sceneManager.register('gameover', new GameOverScene(renderer, sceneManager))
    sceneManager.register('settings', new SettingsScene(renderer, sceneManager))

    sceneManager.changeScene('menu')

    Audio.init()

    bindTouchEvents()

    lastTime = Date.now()
    running = true

    setTimeout(function () {
      requestAnimationFrame(gameLoop)
    }, 50)
  } catch (e) {
    console.error('游戏启动失败:', e)
    showError(e)
  }
}

function gameLoop() {
  if (!running) return

  var now = Date.now()
  var dt = (now - lastTime) / 1000
  lastTime = now

  var clampedDt = Math.min(dt, 0.05)

  try {
    sceneManager.update(clampedDt)
    sceneManager.render()
  } catch (e) {
    console.error('游戏循环错误:', e)
  }

  requestAnimationFrame(gameLoop)
}

function showError(e) {
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 600, 400)
  ctx.fillStyle = '#FF0000'
  ctx.font = '16px Arial'
  ctx.fillText('游戏启动失败: ' + e.message, 20, 100)
}

initCanvas()
startGame()
