/**
 * IPC 通道名称常量
 * 统一管理所有 IPC 通道，避免硬编码
 */

export const IPC_CHANNELS = {
  // ============ 窗口相关 ============
  WINDOW: {
    // 创建小窗口
    CREATE_MINI: 'window:create-mini',
    // 关闭窗口
    CLOSE: 'window:close',
    // 最小化窗口
    MINIMIZE: 'window:minimize',
    // 最大化/还原窗口
    MAXIMIZE: 'window:maximize',
    // 窗口状态变化
    STATE_CHANGED: 'window:state-changed'
  },

  // ============ 应用相关 ============
  APP: {
    // 获取应用版本
    GET_VERSION: 'app:get-version',
    // 退出应用
    QUIT: 'app:quit'
  },

  // ============ 主题相关 ============
  THEME: {
    // 主题变更通知
    CHANGED: 'theme:changed',
    // 获取系统主题
    GET_SYSTEM: 'theme:get-system'
  },

  // ============ 业务模块A ============
  BUSINESS_A: {
    // 连接 WebSocket
    WS_CONNECT: 'business-a:ws-connect',
    // 断开 WebSocket
    WS_DISCONNECT: 'business-a:ws-disconnect',
    // 发送消息
    SEND_MESSAGE: 'business-a:send-message',
    // 接收消息
    ON_MESSAGE: 'business-a:on-message'
  },

  // ============ 业务模块B ============
  BUSINESS_B: {
    WS_CONNECT: 'business-b:ws-connect',
    WS_DISCONNECT: 'business-b:ws-disconnect',
    SEND_MESSAGE: 'business-b:send-message',
    ON_MESSAGE: 'business-b:on-message'
  },

  // ============ 业务模块C ============
  BUSINESS_C: {
    WS_CONNECT: 'business-c:ws-connect',
    WS_DISCONNECT: 'business-c:ws-disconnect',
    SEND_MESSAGE: 'business-c:send-message',
    ON_MESSAGE: 'business-c:on-message'
  },

  // ============ 用户相关 ============
  USER: {
    // 登录
    LOGIN: 'user:login',
    // 登出
    LOGOUT: 'user:logout',
    // 获取用户信息
    GET_INFO: 'user:get-info',
    // 用户信息更新
    INFO_UPDATED: 'user:info-updated'
  },

  // ============ SDK/设备相关 ============
  DEVICE: {
    // 设备连接
    CONNECTED: 'device:connected',
    // 设备断开
    DISCONNECTED: 'device:disconnected',
    // 设备消息（包含设备信息更新）
    MESSAGE: 'device:message',
    // 获取厂商ID
    GET_VENDOR_ID: 'device:get-vendor-id',
    // 获取设备信息
    GET_INFO: 'device:get-info'
  }
}
