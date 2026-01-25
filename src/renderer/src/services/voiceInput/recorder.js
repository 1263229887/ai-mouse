/**
 * 录音器模块
 * 封装 Recorder 库，提供 PCM 格式录音功能
 */

/**
 * 获取录音库
 * 录音库已在 index.html 中通过 script 标签加载
 */
export function getRecorderLib() {
  if (!window.Recorder) {
    throw new Error('录音库未加载，请确保 recorder-core.js 和 pcm.js 已引入')
  }
  return window.Recorder
}

/**
 * 录音器类
 */
export class VoiceRecorder {
  constructor(options = {}) {
    this.rec = null
    this.isRecording = false
    this.sampleBuf = new Int16Array()
    this.chunkSize = options.chunkSize || 1920 // 每次发送的采样点数
    this.onAudioChunk = options.onAudioChunk || null // 音频数据块回调
  }

  /**
   * 初始化录音器
   */
  init() {
    const RecorderLib = getRecorderLib()

    this.rec = RecorderLib({
      type: 'pcm',
      bitRate: 16,
      sampleRate: 16000,
      onProcess: (buffer, powerLevel, bufferDuration, bufferSampleRate) => {
        this._processAudio(buffer, bufferSampleRate)
      }
    })
  }

  /**
   * 开始录音
   */
  start() {
    return new Promise((resolve, reject) => {
      if (!this.rec) {
        reject(new Error('录音器未初始化'))
        return
      }

      this.rec.open(
        () => {
          this.rec.start()
          this.isRecording = true
          this.sampleBuf = new Int16Array()
          console.log('[VoiceRecorder] 开始录音')
          resolve()
        },
        (msg, isUserNotAllow) => {
          console.error('[VoiceRecorder] 无法开始录音:', msg)
          reject(new Error(isUserNotAllow ? '用户拒绝麦克风权限' : msg))
        }
      )
    })
  }

  /**
   * 停止录音
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.rec || !this.isRecording) {
        resolve(null)
        return
      }

      // 发送剩余的音频数据
      if (this.sampleBuf.length > 0 && this.onAudioChunk) {
        this.onAudioChunk(this.sampleBuf)
        this.sampleBuf = new Int16Array()
      }

      this.rec.stop((blob, duration) => {
        console.log('[VoiceRecorder] 停止录音, 时长:', duration)
        this.isRecording = false
        resolve({ blob, duration })
      })
    })
  }

  /**
   * 处理音频数据
   */
  _processAudio(buffer, bufferSampleRate) {
    if (!this.isRecording) return

    const RecorderLib = window.Recorder
    const data48k = buffer[buffer.length - 1]
    const array48k = [data48k]

    // 重采样到 16kHz
    const data16k = RecorderLib.SampleData(array48k, bufferSampleRate, 16000).data

    // 合并到缓冲区
    this.sampleBuf = Int16Array.from([...this.sampleBuf, ...data16k])

    // 分片发送
    while (this.sampleBuf.length >= this.chunkSize) {
      const sendBuf = this.sampleBuf.slice(0, this.chunkSize)
      this.sampleBuf = this.sampleBuf.slice(this.chunkSize)

      if (this.onAudioChunk) {
        this.onAudioChunk(sendBuf)
      }
    }
  }

  /**
   * 销毁录音器
   */
  destroy() {
    if (this.rec) {
      this.rec.close()
      this.rec = null
    }
    this.isRecording = false
  }
}
