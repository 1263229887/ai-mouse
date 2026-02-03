# 前端开发规范

本文档定义了项目的核心开发规范，所有页面和组件开发需遵循以下标准。

---

## 1. 窗口配置

### 1.1 主窗口规格

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 窗口尺寸 | 1200×800px | 固定尺寸 |
| 拉伸缩放 | 禁止 | resizable: false |
| 最大化 | 不支持 | maximizable: false |
| 操作按钮 | 最小化、关闭 | 无最大化按钮 |

### 1.2 布局规则

```scss
// 页面容器
.page-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden; // 禁止滚动条
}

// 内容区域
.content-wrapper {
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
}
```

### 1.3 尺寸单位

- 使用 `px` 单位（固定窗口尺寸，无需响应式）
- 可配合 UnoCSS 的原子化类名

---

## 2. 样式方案

### 2.1 UnoCSS

项目已集成 UnoCSS，支持原子化 CSS 和属性化模式。

```vue
<!-- 原子化类名 -->
<div class="flex items-center justify-center p-4 bg-[var(--bg-color)]"></div>

<!-- 属性化模式 -->
<div flex items-center justify-center p-4></div>

<!-- 快捷方式 -->
<div class="flex-center"></div>
```

### 2.2 预定义快捷方式

| 快捷方式 | 展开 | 说明 |
|----------|------|------|
| `flex-center` | `flex items-center justify-center` | 水平垂直居中 |
| `flex-col-center` | `flex flex-col items-center justify-center` | 垂直方向居中 |
| `btn-primary` | `px-4 py-2 rounded bg-[var(--color-primary)] text-white cursor-pointer` | 主按钮 |
| `card-base` | `rounded-lg bg-[var(--card-bg)] shadow-md` | 基础卡片 |

---

## 3. 主题配色

### 3.1 架构设计

项目固定使用暗色主题，通过 CSS 变量定义颜色。

```
样式系统
styles/themes.scss          # CSS 变量定义（暗色主题）
组件使用 var(--xxx)         # 通过 CSS 变量引用颜色
```

### 3.2 CSS 变量命名规范

```scss
// 颜色类
--color-primary      // 主色
--color-success      // 成功色
--color-warning      // 警告色
--color-danger       // 危险色

// 文字类
--text-primary       // 主要文字
--text-regular       // 常规文字
--text-secondary     // 次要文字
--text-placeholder   // 占位文字

// 背景类
--bg-color           // 基础背景
--bg-color-page      // 页面背景
--bg-color-overlay   // 遮罩背景
--gradient-bg        // 渐变背景

// 边框类
--border-color       // 边框颜色

// 卡片类
--card-bg            // 卡片背景
--card-shadow        // 卡片阴影
```

### 3.3 组件中使用

```vue
<style scoped>
.title {
  color: var(--text-primary);
  background: var(--bg-color);
}
</style>
```

---

## 4. SVG 图标方案

### 3.1 目录结构

```
src/renderer/src/assets/
├── icons/           # SVG 图标（自动导入，支持换肤）
└── images/
    ├── png/         # PNG 图片
    └── svg/         # SVG 图片（非图标类）
```

### 3.2 添加新图标

1. 将 SVG 文件放入 `assets/icons/` 目录
2. SVG 必须使用 `fill="currentColor"` 以支持颜色控制
3. 文件名即为图标名称

### 3.3 SvgIcon 组件使用

```vue
<!-- 基础用法 -->
<SvgIcon name="icon-name" />

<!-- 自定义大小和颜色 -->
<SvgIcon name="star" :size="24" color="#409eff" />

<!-- 使用主题变量（推荐） -->
<SvgIcon name="warning" color="var(--color-warning)" />

<!-- 主题模式（颜色跟随深浅主题自动切换） -->
<SvgIcon name="menu" themed />
```

### 3.4 组件属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | String | 必填 | 图标名称 |
| `size` | Number/String | 16 | 图标大小 |
| `color` | String | currentColor | 图标颜色 |
| `themed` | Boolean | false | 跟随主题自动切换 |

---

## 5. 文件组织规范

### 5.1 渲染进程结构

```
src/renderer/src/
├── assets/              # 静态资源
│   ├── icons/           # SVG 图标
│   └── images/          # 图片资源
├── components/          # 公共组件
│   └── SvgIcon/         # SVG 图标组件
├── router/              # 路由配置
├── stores/              # Pinia 状态管理（模块化）
│   ├── index.ts         # 统一导出
│   └── modules/         # 状态模块
│       ├── app.js       # 应用状态
│       └── user.js      # 用户状态
├── styles/              # 全局样式
│   ├── themes.scss      # 主题变量
│   ├── variables.scss   # SCSS 变量
│   ├── mixins.scss      # SCSS mixins
│   └── global.scss      # 全局样式
└── views/               # 页面组件
```

### 5.2 主进程结构

```
src/main/
├── index.js             # 入口文件
├── windows/             # 窗口管理模块
│   ├── index.js         # 统一导出
│   ├── windowManager.js # 窗口管理器（单例）
│   ├── mainWindow.js    # 主窗口配置
│   └── miniWindow.js    # 小窗口配置
├── ipc/                 # IPC 通信模块
│   ├── index.js         # 统一导出
│   ├── channels.js      # 通道常量定义
│   └── handlers.js      # 处理器注册
└── services/            # 服务模块
    ├── index.js         # 统一导出
    └── websocket.js     # WebSocket 基类
```

### 5.3 预加载脚本结构

```
src/preload/
├── index.js             # 入口文件
└── api/                 # API 模块
    ├── index.js         # 统一导出
    ├── window.js        # 窗口操作 API
    └── app.js           # 应用操作 API
```

---

## 6. 代码风格

- 使用 **单引号**
- **不使用分号**
- 缩进使用 **2 空格**
- 每行最大 **100 字符**

## 7. 工程代码规范

- 遵循现代前端工程化、组件化、模块化

### 7.1 模块导入规范

```js
// ✅ 正确：从统一入口导入 Store
import { useUserStore, useAppStore } from '@/stores'

// ❌ 错误：直接从模块导入
import { useUserStore } from '@/stores/modules/user'
```

### 7.2 模块拆分原则

- 每个模块单一职责
- 统一通过 `index.js` 导出
- 新增模块后在 `index.js` 中注册导出
