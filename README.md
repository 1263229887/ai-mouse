# AI Mouse

智能桌面助手 - 基于 Electron + Vue 3 的桌面应用

## 技术栈

- **框架**: Electron + Vue 3 + Vite
- **UI 组件**: Element Plus
- **状态管理**: Pinia
- **样式**: SCSS + CSS 变量 + UnoCSS
- **图标**: vite-plugin-svg-icons

## 核心特性

### 固定窗口尺寸
- 主窗口固定 1200×800 像素
- 禁止拉伸缩放
- 不支持最大化，仅支持最小化和关闭

### 暗色主题
- 固定使用暗色主题
- 通过 CSS 变量定义颜色

### UnoCSS
- 原子化 CSS 框架
- 支持属性化模式
- 按需生成样式

### SVG 图标
- 自动导入，按需加载
- 支持颜色动态控制

> 详细开发规范见 [docs/frontend-guide.md](./docs/frontend-guide.md)

## 开发环境

### 推荐 IDE

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

### 安装依赖

```bash
pnpm install
```

### 启动开发

```bash
pnpm dev
```

### 构建

```bash
# Windows
pnpm build:win

# macOS
pnpm build:mac

# Linux
pnpm build:linux
```

## 项目结构

```
src/
├── main/                      # Electron 主进程（模块化）
│   ├── index.js               # 入口文件
│   ├── windows/               # 窗口管理模块
│   │   ├── windowManager.js   # 窗口管理器
│   │   ├── mainWindow.js      # 主窗口配置
│   │   └── miniWindow.js      # 小窗口配置
│   ├── ipc/                   # IPC 通信模块
│   │   ├── channels.js        # 通道常量
│   │   └── handlers.js        # 处理器
│   └── services/              # 服务模块
│       └── websocket.js       # WebSocket 基类
├── preload/                   # 预加载脚本（模块化）
│   ├── index.js               # 入口文件
│   └── api/                   # API 模块
│       ├── window.js          # 窗口 API
│       ├── app.js             # 应用 API
│       └── theme.js           # 主题 API
└── renderer/                  # Vue 渲染进程
    └── src/
        ├── assets/            # 静态资源
        │   ├── icons/         # SVG 图标
        │   └── images/        # 图片资源
        ├── components/        # 公共组件
        ├── router/            # 路由配置
        ├── stores/            # Pinia 状态（模块化）
        │   └── modules/       # 状态模块
        │       ├── app.js     # 应用状态
        │       ├── theme.ts   # 主题状态
        │       └── user.js    # 用户状态
        ├── styles/            # 全局样式
        └── views/             # 页面组件
```

## 模块化架构

### 主进程
- **窗口管理**: 支持主窗口 + 多类型小窗口（右下角、不可拉伸）
- **IPC 通信**: 统一通道常量，模块化处理器
- **服务层**: WebSocket 基类，支持自动重连

### 渲染进程
- **状态管理**: 按业务模块拆分 Store
- **统一导出**: 通过 `@/stores` 统一导入
