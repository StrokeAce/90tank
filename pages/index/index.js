const CONFIG = require('../../js/config')
const Renderer = require('../../js/renderer')
const SceneManager = require('../../js/scene_manager')
const MenuScene = require('../../js/scene_menu')
const StageSelectScene = require('../../js/scene_stage_select')
const GameScene = require('../../js/scene_game')
const GameOverScene = require('../../js/scene_gameover')
const SettingsScene = require('../../js/scene_settings')
const Audio = require('../../js/audio')
const PowerUp = require('../../js/powerup')
Page({
  canvas: null,
  ctx: null,
  renderer: null,
  sceneManager: null,
  lastTime: 0,
  running: false,
  gameLoopTimer: null,

  onLoad: function () {
    console.log('坦克游戏加载')
  },

  onReady: function () {
    this.initCanvas()
  },

  onUnload: function () {
    this.running = false
    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer)
    }
  },

  onHide: function () {
    this.running = false
  },

  onShow: function () {
    if (this.canvas && !this.running) {
      this.running = true
      if (!this.gameLoopTimer) {
        const self = this
        this.gameLoopTimer = setInterval(function() {
          self.gameLoop()
        }, 1000 / 60)
      }
    }
  },

  initCanvas: function () {
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('Canvas获取失败')
          return
        }
        
        this.canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
        
        console.log('Canvas尺寸:', width, 'x', height)
        
        const sysInfo = wx.getSystemInfoSync()
        const dpr = sysInfo.pixelRatio
        
        this.canvas.width = width * dpr
        this.canvas.height = height * dpr
        
        this.ctx = this.canvas.getContext('2d')
        this.ctx.scale(dpr, dpr)
        
        this.canvas.savedWidth = width
        this.canvas.savedHeight = height
        
        this.canvas.getContext = (type) => {
          return this.ctx
        }
        
        this.startGame()
      })
  },

  startGame: async function () {
    try {
      PowerUp.setCanvas(this.canvas);
      
      console.log('等待道具图标加载...');
      await PowerUp.loadPowerupIcons().catch(function() {
        console.log('部分道具图标加载失败，将使用默认图标');
      });
      
      this.renderer = new Renderer()
      this.renderer.init(this.canvas)

      this.sceneManager = new SceneManager(this.renderer)

      this.sceneManager.register('menu', new MenuScene(this.renderer, this.sceneManager))
      this.sceneManager.register('stageSelect', new StageSelectScene(this.renderer, this.sceneManager))
      this.sceneManager.register('game', new GameScene(this.renderer, this.sceneManager))
      this.sceneManager.register('gameover', new GameOverScene(this.renderer, this.sceneManager))
      this.sceneManager.register('settings', new SettingsScene(this.renderer, this.sceneManager))

      this.sceneManager.changeScene('menu')

      Audio.init()

      this.lastTime = Date.now()
      this.running = true
      
      const self = this
      if (!this.gameLoopTimer) {
        this.gameLoopTimer = setInterval(function() {
          self.gameLoop()
        }, 1000 / 60)
      }
    } catch (e) {
      console.error('游戏启动失败:', e)
      this.showError(e)
    }
  },

  gameLoop: function () {
    if (!this.running) return

    const now = Date.now()
    const dt = (now - this.lastTime) / 1000
    this.lastTime = now

    const clampedDt = Math.min(dt, 0.05)

    try {
      this.sceneManager.update(clampedDt)
      this.sceneManager.render()
    } catch (e) {
      console.error('游戏循环错误:', e)
    }
  },

  handleTouchStart: function(e) {
    if (this.sceneManager && this.sceneManager.getCurrentScene()) {
      const scene = this.sceneManager.getCurrentScene()
      
      if (scene.input) {
        const touches = e.touches.map(t => ({
          clientX: t.x,
          clientY: t.y,
          identifier: t.identifier
        }))
        for (let i = 0; i < touches.length; i++) {
          scene.input._handleTouchStart(touches[i])
        }
      } else if (scene.handleTouchStart) {
        scene.handleTouchStart({
          touches: e.touches.map(t => ({
            clientX: t.x,
            clientY: t.y,
            identifier: t.identifier
          }))
        })
      }
    }
  },

  handleTouchMove: function(e) {
    if (this.sceneManager && this.sceneManager.getCurrentScene()) {
      const scene = this.sceneManager.getCurrentScene()
      
      if (scene.input) {
        const touches = e.touches.map(t => ({
          clientX: t.x,
          clientY: t.y,
          identifier: t.identifier
        }))
        for (let i = 0; i < touches.length; i++) {
          scene.input._handleTouchMove(touches[i])
        }
      }
    }
  },

  handleTouchEnd: function(e) {
    if (this.sceneManager && this.sceneManager.getCurrentScene()) {
      const scene = this.sceneManager.getCurrentScene()
      
      if (scene.input) {
        const changedTouches = e.changedTouches.map(t => ({
          clientX: t.x,
          clientY: t.y,
          identifier: t.identifier
        }))
        for (let i = 0; i < changedTouches.length; i++) {
          scene.input._handleTouchEnd(changedTouches[i])
        }
      } else if (scene.handleTouchEnd) {
        scene.handleTouchEnd({
          changedTouches: e.changedTouches.map(t => ({
            clientX: t.x,
            clientY: t.y,
            identifier: t.identifier
          }))
        })
      }
    }
  },

  showError: function(e) {
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, 600, 400)
    this.ctx.fillStyle = '#FF0000'
    this.ctx.font = '16px Arial'
    this.ctx.fillText('游戏启动失败: ' + e.message, 20, 100)
  }
})
