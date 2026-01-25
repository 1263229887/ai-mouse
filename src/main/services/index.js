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
  isSDKInitialized,
  getCurrentDeviceState,
  updateDeviceVendorId
} from './sdk'
export { generateOpenId, validateEncryptData } from './crypto'
export {
  setupUpdater,
  checkForUpdate,
  downloadUpdate,
  quitAndInstall,
  getIsUpdating
} from './updater'
