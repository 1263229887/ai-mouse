/**
 * 窗口管理器
 * 统一管理所有窗口的创建、销毁和状态
 */

class WindowManager {
  constructor() {
    // 窗口实例映射表
    this.windows = new Map()
  }

  /**
   * 注册窗口
   * @param {string} name - 窗口名称
   * @param {BrowserWindow} window - 窗口实例
   */
  register(name, window) {
    this.windows.set(name, window)

    // 窗口关闭时自动移除
    window.on('closed', () => {
      this.windows.delete(name)
    })
  }

  /**
   * 获取窗口
   * @param {string} name - 窗口名称
   * @returns {BrowserWindow|undefined}
   */
  get(name) {
    return this.windows.get(name)
  }

  /**
   * 获取主窗口
   * @returns {BrowserWindow|undefined}
   */
  getMain() {
    return this.get('main')
  }

  /**
   * 检查窗口是否存在
   * @param {string} name - 窗口名称
   * @returns {boolean}
   */
  has(name) {
    return this.windows.has(name)
  }

  /**
   * 关闭指定窗口
   * @param {string} name - 窗口名称
   */
  close(name) {
    const window = this.windows.get(name)
    if (window && !window.isDestroyed()) {
      window.close()
    }
  }

  /**
   * 关闭所有窗口
   */
  closeAll() {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })
  }

  /**
   * 获取所有窗口名称
   * @returns {string[]}
   */
  getAllNames() {
    return Array.from(this.windows.keys())
  }

  /**
   * 向指定窗口发送消息
   * @param {string} name - 窗口名称
   * @param {string} channel - IPC 通道
   * @param {any} data - 数据
   */
  sendTo(name, channel, data) {
    const window = this.windows.get(name)
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  }

  /**
   * 向所有窗口广播消息
   * @param {string} channel - IPC 通道
   * @param {any} data - 数据
   */
  broadcast(channel, data) {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
  }
}

// 单例导出
export const windowManager = new WindowManager()
