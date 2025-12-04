/**
 * Recorder 录音工具封装
 * 基于 Recorder-core 库 (https://github.com/xiangyuecn/Recorder)
 * 适配为 ES 模块使用
 */

// ======================== Recorder Core ========================
const NOOP = () => {}

class RecorderCore {
  constructor(options = {}) {
    this.set = {
      type: 'pcm',
      bitRate: 16,
      sampleRate: 16000,
      onProcess: options.onProcess || NOOP,
      ...options
    }

    this.stream = null
    this.audioContext = null
    this.mediaSource = null
    this.processor = null
    this.isOpen = false
    this.isRecording = false
    this.buffers = []
    this.recSize = 0
    this.srcSampleRate = 48000
  }

  /**
   * 检测浏览器是否支持录音
   */
  static Support() {
    const scope = navigator.mediaDevices || {}
    if (!scope.getUserMedia) {
      const nav = navigator
      scope.getUserMedia = nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia
    }
    if (!scope.getUserMedia) {
      return false
    }
    
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      return false
    }
    
    return true
  }

  /**
   * 打开录音资源
   */
  async open() {
    if (!RecorderCore.Support()) {
      throw new Error('浏览器不支持录音')
    }

    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000
        }
      })

      // 创建 AudioContext
      const AudioContext = window.AudioContext || window.webkitAudioContext
      this.audioContext = new AudioContext()
      this.srcSampleRate = this.audioContext.sampleRate

      console.log('[Recorder] 麦克风已打开, 采样率:', this.srcSampleRate)
      this.isOpen = true
      return true
    } catch (error) {
      console.error('[Recorder] 打开麦克风失败:', error)
      throw error
    }
  }

  /**
   * 开始录音
   */
  start() {
    if (!this.isOpen || !this.stream || !this.audioContext) {
      console.error('[Recorder] 请先调用 open() 方法')
      return false
    }

    if (this.isRecording) {
      console.warn('[Recorder] 已在录音中')
      return false
    }

    try {
      // 恢复 AudioContext
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }

      // 创建媒体流源
      this.mediaSource = this.audioContext.createMediaStreamSource(this.stream)

      // 创建 ScriptProcessor（兼容性最好）
      const bufferSize = 4096
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

      // 处理音频数据
      this.processor.onaudioprocess = (event) => {
        if (!this.isRecording) return

        const inputData = event.inputBuffer.getChannelData(0)
        
        // 转换为 Float32Array
        const float32Data = new Float32Array(inputData)
        
        // 转换为 Int16
        const pcmData = this.floatTo16BitPCM(float32Data)
        
        // 计算音量
        let sum = 0
        for (let i = 0; i < pcmData.length; i++) {
          sum += Math.abs(pcmData[i])
        }
        const powerLevel = this.calculatePowerLevel(sum, pcmData.length)

        // 保存到缓冲区
        this.buffers.push(pcmData)
        this.recSize += pcmData.length

        // 计算时长
        const bufferDuration = Math.round(this.recSize / this.set.sampleRate * 1000)

        // 重采样处理
        const resampledData = this.resample(pcmData, this.srcSampleRate, this.set.sampleRate)

        // 回调
        this.set.onProcess(
          this.buffers,
          powerLevel,
          bufferDuration,
          this.set.sampleRate,
          this.buffers.length - 1,
          NOOP,
          resampledData
        )
      }

      // 连接节点
      this.mediaSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.isRecording = true
      console.log('[Recorder] 开始录音')
      return true
    } catch (error) {
      console.error('[Recorder] 开始录音失败:', error)
      return false
    }
  }

  /**
   * 停止录音
   */
  stop(successCallback, failCallback) {
    if (!this.isRecording) {
      failCallback?.('未在录音')
      return
    }

    this.isRecording = false

    // 断开节点
    if (this.processor) {
      this.processor.disconnect()
      this.processor.onaudioprocess = null
      this.processor = null
    }

    if (this.mediaSource) {
      this.mediaSource.disconnect()
      this.mediaSource = null
    }

    console.log('[Recorder] 停止录音, 数据大小:', this.recSize)

    // 合并所有缓冲区
    const totalLength = this.buffers.reduce((acc, buf) => acc + buf.length, 0)
    const result = new Int16Array(totalLength)
    let offset = 0
    for (const buf of this.buffers) {
      result.set(buf, offset)
      offset += buf.length
    }

    // 转换为 Blob
    const blob = new Blob([result.buffer], { type: 'audio/pcm' })
    const duration = Math.round(totalLength / this.set.sampleRate * 1000)

    successCallback?.(blob, duration)
  }

  /**
   * 关闭录音资源
   */
  close() {
    this.isRecording = false
    this.isOpen = false

    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.mediaSource) {
      this.mediaSource.disconnect()
      this.mediaSource = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    this.buffers = []
    this.recSize = 0

    console.log('[Recorder] 录音资源已释放')
  }

  /**
   * Float32 转 Int16 PCM
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
   * 重采样
   */
  resample(data, srcRate, targetRate) {
    if (srcRate === targetRate) {
      return data
    }

    const ratio = srcRate / targetRate
    const newLength = Math.round(data.length / ratio)
    const result = new Int16Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const t = srcIndex - srcIndexFloor

      // 线性插值
      const before = data[srcIndexFloor]
      const after = data[srcIndexCeil]
      result[i] = Math.round(before + (after - before) * t)
    }

    return result
  }

  /**
   * 计算音量等级 (0-100)
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
}

// ======================== SampleData 静态方法 ========================
/**
 * 采样率转换
 */
RecorderCore.SampleData = function(pcmDatas, pcmSampleRate, newSampleRate, prevChunkInfo = {}) {
  let index = prevChunkInfo.index || 0
  let offset = prevChunkInfo.offset || 0

  const nLen = pcmDatas.length
  let size = 0
  for (let i = index; i < nLen; i++) {
    size += pcmDatas[i].length
  }
  size = Math.max(0, size - Math.floor(offset))

  // 采样
  let step = pcmSampleRate / newSampleRate
  if (step > 1) {
    size = Math.floor(size / step)
  } else {
    step = 1
    newSampleRate = pcmSampleRate
  }

  const res = new Int16Array(size)
  let idx = 0

  for (; index < nLen; index++) {
    const o = pcmDatas[index]
    let i = offset
    const il = o.length
    while (i < il && idx < size) {
      const before = Math.floor(i)
      const after = Math.ceil(i)
      const atPoint = i - before

      const beforeVal = o[before]
      const afterVal = after < il ? o[after] : (pcmDatas[index + 1] || [beforeVal])[0] || 0
      res[idx] = Math.round(beforeVal + (afterVal - beforeVal) * atPoint)

      idx++
      i += step
    }
    offset = i - il
  }

  return {
    index: index,
    offset: offset,
    sampleRate: newSampleRate,
    data: res
  }
}

/**
 * PCM 转 WAV
 */
RecorderCore.pcm2wav = function(data, successCallback, failCallback) {
  if (data.slice && data.type != null) {
    data = { blob: data }
  }
  
  const sampleRate = data.sampleRate || 16000
  const bitRate = data.bitRate || 16

  const reader = new FileReader()
  reader.onloadend = function() {
    let pcm
    if (bitRate === 8) {
      const u8arr = new Uint8Array(reader.result)
      pcm = new Int16Array(u8arr.length)
      for (let j = 0; j < u8arr.length; j++) {
        pcm[j] = (u8arr[j] - 128) << 8
      }
    } else {
      pcm = new Int16Array(reader.result)
    }

    // 创建 WAV 头
    const size = pcm.length
    const dataLength = size * (bitRate / 8)
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    let offset = 0
    const writeString = (str) => {
      for (let i = 0; i < str.length; i++, offset++) {
        view.setUint8(offset, str.charCodeAt(i))
      }
    }
    const write16 = (v) => {
      view.setUint16(offset, v, true)
      offset += 2
    }
    const write32 = (v) => {
      view.setUint32(offset, v, true)
      offset += 4
    }

    writeString('RIFF')
    write32(36 + dataLength)
    writeString('WAVE')
    writeString('fmt ')
    write32(16)
    write16(1)
    write16(1)
    write32(sampleRate)
    write32(sampleRate * (bitRate / 8))
    write16(bitRate / 8)
    write16(bitRate)
    writeString('data')
    write32(dataLength)

    for (let i = 0; i < size; i++, offset += 2) {
      view.setInt16(offset, pcm[i], true)
    }

    const wavBlob = new Blob([view.buffer], { type: 'audio/wav' })
    const duration = Math.round(size / sampleRate * 1000)
    successCallback?.(wavBlob, duration)
  }
  reader.readAsArrayBuffer(data.blob)
}

export default RecorderCore
export { RecorderCore }
