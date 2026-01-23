/**
 * 服务模块统一导出
 */

export { WebSocketService } from './websocket'
export {
  initSDK,
  closeSDK,
  getDeviceName,
  getConnectedDeviceCount,
  getConnectionMode,
  getDeviceVendorId,
  addEventListener,
  removeEventListener,
  isSDKInitialized
} from './sdk'
