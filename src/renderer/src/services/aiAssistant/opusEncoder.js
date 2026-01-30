/**
 * Opus 编码器模块
 * 参照 temp/websocket_test_old/old_test_page.html 实现
 * 将 PCM 数据编码为 Opus 格式
 */

// Opus 编码配置（与 old_test_page.html 保持一致）
const SAMPLE_RATE = 16000 // 16kHz
const CHANNELS = 1 // 单声道
const FRAME_SIZE = 960 // 60ms @ 16kHz = 960 samples
const MAX_PACKET_SIZE = 4000 // 最大包大小
const OPUS_APPLICATION_VOIP = 2048 // VOIP模式（与服务端一致）

/**
 * Opus 编码器类
 */
export class OpusEncoder {
  constructor() {
    this.encoder = null
    this.module = null
    this.isInitialized = false
    // PCM 缓冲区（用于累积足够一帧的数据）
    this.pcmBuffer = new Int16Array(0)
  }

  /**
   * 初始化编码器
   */
  init() {
    try {
      // 检查 libopus.js 是否已加载
      if (typeof window.Module === 'undefined') {
        return false
      }

      // 使用 Module.instance（libopus.js 导出方式）或全局 Module
      if (typeof window.Module.instance !== 'undefined') {
        this.module = window.Module.instance
      } else {
        this.module = window.Module
      }

      // 检查编码器函数是否存在
      if (typeof this.module._opus_encoder_get_size !== 'function') {
        return false
      }

      // 获取编码器大小并分配内存
      const encoderSize = this.module._opus_encoder_get_size(CHANNELS)

      this.encoderPtr = this.module._malloc(encoderSize)
      if (!this.encoderPtr) {
        return false
      }

      // 初始化编码器（使用 VOIP 模式，与 old_test_page.html 一致）
      const err = this.module._opus_encoder_init(
        this.encoderPtr,
        SAMPLE_RATE,
        CHANNELS,
        OPUS_APPLICATION_VOIP
      )

      if (err < 0) {
        this.module._free(this.encoderPtr)
        this.encoderPtr = null
        return false
      }

      // 设置位率 (16kbps)
      this.module._opus_encoder_ctl(this.encoderPtr, 4002, 16000) // OPUS_SET_BITRATE

      // 设置复杂度 (0-10)
      this.module._opus_encoder_ctl(this.encoderPtr, 4010, 5) // OPUS_SET_COMPLEXITY

      // 设置 DTX (不传输静音帧)
      this.module._opus_encoder_ctl(this.encoderPtr, 4016, 1) // OPUS_SET_DTX

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('[OpusEncoder] 初始化编码器失败:', error)
      return false
    }
  }

  /**
   * 编码 PCM 数据为 Opus
   * @param {Int16Array} pcmData - PCM 数据
   * @returns {Uint8Array|null} Opus 编码后的数据
   */
  encode(pcmData) {
    if (!this.isInitialized || !this.encoderPtr) {
      return null
    }

    if (pcmData.length !== FRAME_SIZE) {
      return null
    }

    try {
      const mod = this.module

      // 为 PCM 数据分配内存 (2字节/int16)
      const pcmPtr = mod._malloc(pcmData.length * 2)

      // 将 PCM 数据复制到 HEAP
      for (let i = 0; i < pcmData.length; i++) {
        mod.HEAP16[(pcmPtr >> 1) + i] = pcmData[i]
      }

      // 为输出分配内存
      const outPtr = mod._malloc(MAX_PACKET_SIZE)

      // 进行编码
      const encodedLen = mod._opus_encode(
        this.encoderPtr,
        pcmPtr,
        FRAME_SIZE,
        outPtr,
        MAX_PACKET_SIZE
      )

      if (encodedLen < 0) {
        mod._free(pcmPtr)
        mod._free(outPtr)
        return null
      }

      // 复制编码后的数据
      const opusData = new Uint8Array(encodedLen)
      for (let i = 0; i < encodedLen; i++) {
        opusData[i] = mod.HEAPU8[outPtr + i]
      }

      // 释放内存
      mod._free(pcmPtr)
      mod._free(outPtr)

      return opusData
    } catch (error) {
      console.error('[OpusEncoder] 编码数据失败:', error)
      return null
    }
  }

  /**
   * 处理 PCM 数据（累积并编码）
   * @param {Int16Array} pcmData - PCM 数据
   * @returns {Uint8Array[]} 编码后的 Opus 帧数组
   */
  process(pcmData) {
    const results = []

    // 合并到缓冲区
    const newBuffer = new Int16Array(this.pcmBuffer.length + pcmData.length)
    newBuffer.set(this.pcmBuffer)
    newBuffer.set(pcmData, this.pcmBuffer.length)
    this.pcmBuffer = newBuffer

    // 当缓冲区有足够数据时编码
    while (this.pcmBuffer.length >= FRAME_SIZE) {
      const frame = this.pcmBuffer.slice(0, FRAME_SIZE)
      this.pcmBuffer = this.pcmBuffer.slice(FRAME_SIZE)

      const opusData = this.encode(frame)
      if (opusData) {
        results.push(opusData)
      }
    }

    return results
  }

  /**
   * 刷新剩余数据（用静音填充）
   * @returns {Uint8Array|null} 最后一帧编码后的数据
   */
  flush() {
    if (this.pcmBuffer.length === 0) {
      return null
    }

    // 用静音填充到完整帧
    const paddedBuffer = new Int16Array(FRAME_SIZE)
    paddedBuffer.set(this.pcmBuffer)
    this.pcmBuffer = new Int16Array(0)

    return this.encode(paddedBuffer)
  }

  /**
   * 销毁编码器
   */
  destroy() {
    if (this.encoderPtr && this.module) {
      this.module._free(this.encoderPtr)
      this.encoderPtr = null
    }
    this.isInitialized = false
    this.pcmBuffer = new Int16Array(0)
  }
}

// 导出帧大小常量
export const OPUS_FRAME_SIZE = FRAME_SIZE
