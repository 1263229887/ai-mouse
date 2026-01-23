import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 设备信息 Store
 * 管理硬件设备状态，支持全局访问和实时更新
 */
export const useDeviceStore = defineStore('device', () => {
  // 当前设备ID
  const deviceId = ref('')

  // 设备序列号
  const serialNumber = ref('')

  // 设备版本号
  const version = ref('')

  // 厂商ID
  const vendorId = ref('')

  // 设备在线状态
  const isOnline = ref(false)

  // 设备名称
  const deviceName = ref('')

  // 连接方式（0: 无线, 1: 有线, 2: 蓝牙）
  const connectionMode = ref(-1)

  // 是否已连接设备
  const isConnected = computed(() => !!deviceId.value)

  // 连接方式文本
  const connectionModeText = computed(() => {
    switch (connectionMode.value) {
      case 0:
        return '无线'
      case 1:
        return '有线'
      case 2:
        return '蓝牙'
      default:
        return '未知'
    }
  })

  /**
   * 设置设备ID
   */
  function setDeviceId(id) {
    deviceId.value = id
  }

  /**
   * 设置设备序列号
   */
  function setSerialNumber(sn) {
    serialNumber.value = sn
  }

  /**
   * 设置设备版本号
   */
  function setVersion(ver) {
    version.value = ver
  }

  /**
   * 设置厂商ID
   */
  function setVendorId(id) {
    vendorId.value = id
  }

  /**
   * 设置在线状态
   */
  function setOnlineStatus(status) {
    isOnline.value = status
  }

  /**
   * 设置设备名称
   */
  function setDeviceName(name) {
    deviceName.value = name
  }

  /**
   * 设置连接方式
   */
  function setConnectionMode(mode) {
    connectionMode.value = mode
  }

  /**
   * 批量更新设备信息
   */
  function updateDeviceInfo(info) {
    if (info.deviceId !== undefined) deviceId.value = info.deviceId
    if (info.serialNumber !== undefined) serialNumber.value = info.serialNumber
    if (info.version !== undefined) version.value = info.version
    if (info.vendorId !== undefined) vendorId.value = info.vendorId
    if (info.isOnline !== undefined) isOnline.value = info.isOnline
    if (info.deviceName !== undefined) deviceName.value = info.deviceName
    if (info.connectionMode !== undefined) connectionMode.value = info.connectionMode
  }

  /**
   * 设备断开时重置状态
   */
  function resetDevice() {
    deviceId.value = ''
    serialNumber.value = ''
    version.value = ''
    vendorId.value = ''
    isOnline.value = false
    deviceName.value = ''
    connectionMode.value = -1
  }

  return {
    // 状态
    deviceId,
    serialNumber,
    version,
    vendorId,
    isOnline,
    deviceName,
    connectionMode,

    // 计算属性
    isConnected,
    connectionModeText,

    // 方法
    setDeviceId,
    setSerialNumber,
    setVersion,
    setVendorId,
    setOnlineStatus,
    setDeviceName,
    setConnectionMode,
    updateDeviceInfo,
    resetDevice
  }
})
