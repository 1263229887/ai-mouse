/**
 * WebSocket 服务基类
 * 提供 WebSocket 连接的基础功能
 */

export class WebSocketService {
  constructor(name) {
    this.name = name
    this.ws = null
    this.url = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
    this.listeners = new Map()
  }

  /**
   * 连接 WebSocket
   * @param {string} url - WebSocket 地址
   * @returns {Promise<void>}
   */
  connect(url) {
    return new Promise((resolve, reject) => {
      this.url = url
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log(`[${this.name}] WebSocket connected`)
        this.reconnectAttempts = 0
        this.emit('connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit('message', data)
        } catch {
          this.emit('message', event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error(`[${this.name}] WebSocket error:`, error)
        this.emit('error', error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log(`[${this.name}] WebSocket disconnected`)
        this.emit('disconnected')
        this.tryReconnect()
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 发送消息
   * @param {any} data - 要发送的数据
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      this.ws.send(message)
    } else {
      console.warn(`[${this.name}] WebSocket not connected`)
    }
  }

  /**
   * 尝试重连
   */
  tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.url) {
      this.reconnectAttempts++
      console.log(
        `[${this.name}] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      )
      setTimeout(() => {
        this.connect(this.url).catch(() => {})
      }, this.reconnectInterval)
    }
  }

  /**
   * 注册事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {any} data - 数据
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  /**
   * 获取连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}
