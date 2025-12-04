/**
 * 音频录音工具类
 * 基于 Web Audio API 实现麦克风录音
 * 输出 16kHz 采样率的 PCM 数据
 */

class AudioRecorder {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000 // 目标采样率
    this.bufferSize = options.bufferSize || 4096
    this.onProcessCallback = null
    this.onErrorCallback = null

    this.audioContext = null
    this.mediaStream = null
    this.sourceNode = null
    this.processorNode = null
    this.isRecording = false
  }

  /**
   * 打开麦克风权限
   * @returns {Promise}
   */
  async open() {
    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000
        }
      })

      // 创建 AudioContext
      const AudioContext = window.AudioContext || window.webkitAudioContext
      this.audioContext = new AudioContext()

      console.log('麦克风已打开, 采样率:', this.audioContext.sampleRate)
      return true
    } catch (error) {
      console.error('打开麦克风失败:', error)
      this.onErrorCallback?.(error)
      throw error
    }
  }

  /**
   * 开始录音
   */
  start() {
    if (!this.audioContext || !this.mediaStream) {
      console.error('请先调用 open() 方法')
      return false
    }

    if (this.isRecording) {
      console.warn('已在录音中')
      return false
    }

    try {
      // 恢复 AudioContext（如果被挂起）
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }

      // 创建音频源节点
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

      // 创建 ScriptProcessor 节点（兼容性好）
      this.processorNode = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1)

      const srcSampleRate = this.audioContext.sampleRate
      const targetSampleRate = this.sampleRate

      // 处理音频数据
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) return

        const inputData = event.inputBuffer.getChannelData(0)

        // 重采样到目标采样率
        const resampledData = this.resample(inputData, srcSampleRate, targetSampleRate)

        // 转换为 Int16Array
        const pcmData = this.floatTo16BitPCM(resampledData)

        // 计算音量
        let sum = 0
        for (let i = 0; i < pcmData.length; i++) {
          sum += Math.abs(pcmData[i])
        }
        const powerLevel = this.calculatePowerLevel(sum, pcmData.length)

        // 回调处理后的数据
        this.onProcessCallback?.(pcmData, powerLevel)
      }

      // 连接节点
      this.sourceNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)

      this.isRecording = true
      console.log('开始录音')
      return true
    } catch (error) {
      console.error('开始录音失败:', error)
      this.onErrorCallback?.(error)
      return false
    }
  }

  /**
   * 停止录音
   */
  stop() {
    if (!this.isRecording) {
      return
    }

    this.isRecording = false

    // 断开节点连接
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode.onaudioprocess = null
      this.processorNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    console.log('停止录音')
  }

  /**
   * 关闭录音资源
   */
  close() {
    this.stop()

    // 关闭 AudioContext
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // 停止所有音轨
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    console.log('录音资源已释放')
  }

  /**
   * 重采样
   * @param {Float32Array} data - 原始数据
   * @param {number} srcRate - 源采样率
   * @param {number} targetRate - 目标采样率
   * @returns {Float32Array} - 重采样后的数据
   */
  resample(data, srcRate, targetRate) {
    if (srcRate === targetRate) {
      return data
    }

    const ratio = srcRate / targetRate
    const newLength = Math.round(data.length / ratio)
    const result = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const t = srcIndex - srcIndexFloor

      // 线性插值
      result[i] = data[srcIndexFloor] * (1 - t) + data[srcIndexCeil] * t
    }

    return result
  }

  /**
   * Float32 转 Int16 PCM
   * @param {Float32Array} float32Array
   * @returns {Int16Array}
   */
  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Array
  }

  /**
   * 计算音量等级 (0-100)
   * @param {number} sum - 采样绝对值之和
   * @param {number} length - 采样数量
   * @returns {number}
   */
  calculatePowerLevel(sum, length) {
    const power = (sum / length) || 0
    let level
    if (power < 1251) {
      level = Math.round((power / 1250) * 10)
    } else {
      level = Math.round(Math.min(100, Math.max(0, (1 + Math.log(power / 10000) / Math.log(10)) * 100)))
    }
    return level
  }

  /**
   * 设置音频处理回调
   * @param {Function} callback - (pcmData: Int16Array, powerLevel: number) => void
   */
  onProcess(callback) {
    this.onProcessCallback = callback
  }

  /**
   * 设置错误回调
   * @param {Function} callback - (error) => void
   */
  onError(callback) {
    this.onErrorCallback = callback
  }
}

export default AudioRecorder
