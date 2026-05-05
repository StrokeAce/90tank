# 经典90坦克 - 横屏触控版

这是一个微信小游戏项目，完整复刻1990年代经典的坦克大战游戏。

## 项目结构

```
tank/
├── game.js           # 游戏入口文件
├── game.json         # 微信小游戏配置文件（不是app.json）
├── project.config.json  # 项目配置
└── js/
    ├── config.js     # 全局配置
    ├── utils.js      # 工具函数
    ├── storage.js    # 本地存储
    ├── sprites.js    # 精灵生成
    ├── maps.js       # 关卡数据（35关）
    ├── entity.js     # 实体基类
    ├── tank.js       # 坦克实体
    ├── bullet.js     # 子弹实体
    ├── explosion.js  # 爆炸效果
    ├── powerup.js    # 道具系统
    ├── map.js        # 地图渲染和碰撞
    ├── collision.js  # 碰撞检测
    ├── enemy_ai.js   # 敌人AI
    ├── input.js      # 输入系统（虚拟摇杆）
    ├── renderer.js   # 渲染器
    ├── hud.js        # HUD界面
    ├── audio.js      # 音效系统
    ├── scene_manager.js  # 场景管理器
    ├── scene_menu.js     # 主菜单
    ├── scene_stage_select.js  # 选关界面
    ├── scene_game.js     # 游戏主场景
    └── scene_gameover.js # 游戏结束界面
```

## 游戏特性

✅ 35个完整关卡
✅ 单人游戏模式
✅ 双人本地合作
✅ 横屏触控操作
✅ 双虚拟摇杆
✅ 4种敌人坦克
✅ 6种道具
✅ 本地排行榜
✅ 像素风格画面

## 开发说明

### 微信小程序 vs 微信小游戏

**注意：这是微信小游戏项目，不是小程序！**

- **微信小程序** 使用 `app.json`
- **微信小游戏** 使用 `game.json`

本项目使用微信小游戏开发框架。

### 快速开始

1. 下载微信开发者工具
2. 导入项目，选择"小游戏"
3. 使用测试号或自己的 appid
4. 点击编译运行

## 技术栈

- 微信小游戏 Canvas API
- CommonJS 模块系统
- 纯 JavaScript（无框架）

## 操作说明

### 单人模式
- **左摇杆**：控制移动
- **右摇杆**：控制射击方向
- **开火按钮**：发射子弹

### 双人模式
- 玩家1：左侧控制区
- 玩家2：右侧控制区

## 游戏规则

- 保护基地（老鹰）
- 消灭所有敌人过关
- 收集道具增强实力
- 最多3条命

---

祝你游戏愉快！
