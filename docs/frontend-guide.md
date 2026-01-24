# 前端开发规范

本文档定义了项目的核心开发规范，所有页面和组件开发需遵循以下标准。

---

## 1. 响应式布局方案

### 1.1 核心策略

采用 **clamp() + rem + Flex/Grid** 组合方案，实现流体响应式布局。

### 1.2 主窗口配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 初始窗口 | 屏幕宽度 66% | 高度按 3:2 比例计算 |
| 最小窗口 | 屏幕宽度 50% | 高度按 3:2 比例计算 |
| 宽高比 | 3:2 | 基于 1200×800 标准 |

### 1.3 布局规则

```scss
// 页面容器必须遵循的规则
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

### 1.4 clamp() 使用规范

| 用途 | 示例 | 说明 |
|------|------|------|
| 字体大小 | `clamp(1rem, 2vw, 1.5rem)` | 最小-理想-最大 |
| 间距 | `clamp(0.5rem, 2vw, 1rem)` | 响应式间距 |
| 容器宽度 | `clamp(200px, 25vw, 300px)` | 弹性宽度 |

### 1.5 禁止事项

- ❌ 使用固定像素值（除非是边框、图标等小尺寸）
- ❌ 出现页面滚动条
- ❌ 使用媒体查询断点（优先使用 clamp）

---

## 2. 主题换肤方案

### 2.1 架构设计

```
主题系统
├── styles/themes.scss          # CSS 变量定义（light/dark）
├── stores/modules/theme.ts     # Pinia 状态管理
└── 组件使用 var(--xxx)         # 通过 CSS 变量引用颜色
```

### 2.2 CSS 变量命名规范

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

### 2.3 组件中使用主题色

```vue
<style scoped>
.title {
  color: var(--text-primary);
  background: var(--bg-color);
  transition: color 0.3s ease, background 0.3s ease;
}
</style>
```

### 2.4 切换主题

```js
import { useThemeStore } from '@/stores'

const themeStore = useThemeStore()
themeStore.toggleTheme() // 切换深浅主题
```

---

## 3. SVG 图标方案

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

## 4. 文件组织规范

### 4.1 渲染进程结构

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
│       ├── theme.ts     # 主题状态
│       └── user.js      # 用户状态
├── styles/              # 全局样式
│   ├── themes.scss      # 主题变量
│   ├── variables.scss   # SCSS 变量
│   ├── mixins.scss      # SCSS mixins
│   └── global.scss      # 全局样式
└── views/               # 页面组件
```

### 4.2 主进程结构

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

### 4.3 预加载脚本结构

```
src/preload/
├── index.js             # 入口文件
└── api/                 # API 模块
    ├── index.js         # 统一导出
    ├── window.js        # 窗口操作 API
    ├── app.js           # 应用操作 API
    └── theme.js         # 主题操作 API
```

---

## 5. 代码风格

- 使用 **单引号**
- **不使用分号**
- 缩进使用 **2 空格**
- 每行最大 **100 字符**

## 6. 工程代码规范

- 遵循现代前端工程化、组件化、模块化

### 6.1 模块导入规范

```js
// ✅ 正确：从统一入口导入 Store
import { useThemeStore, useUserStore, useAppStore } from '@/stores'

// ❌ 错误：直接从模块导入
import { useThemeStore } from '@/stores/modules/theme'
```

### 6.2 模块拆分原则

- 每个模块单一职责
- 统一通过 `index.js` 导出
- 新增模块后在 `index.js` 中注册导出
