# SDK 回调异步化方案

## 问题背景

SDK 厂商明确要求：**不得在 `OnDeviceMessageCallback` 处理 `deviceKeyEvent` 类型消息的线程中，直接调用其他 SDK 函数或执行耗时操作。**

违反此约束可能导致：
- 按键事件偶发性不触发
- SDK 内部线程阻塞或死锁
- 回调机制失效

## 技术约束

JavaScript 是单线程语言，Electron 主进程运行在 Node.js 的单线程事件循环中。

但 SDK 的原生回调是从 C++ 层调用过来的，在回调执行期间同步调用其他 SDK 函数可能导致线程安全问题。

## 解决方案

使用 `setImmediate()` 将 SDK 调用和后续业务逻辑推迟到下一个事件循环周期执行。

```
SDK Native 回调
    ↓
JS 回调函数（仅做数据解析）
    ↓ 立即返回，不阻塞
    └──→ setImmediate() 入队
         ↓
    [下一个事件循环周期]
         ↓
    执行业务逻辑 / 调用其他 SDK 函数 ✅
```

## 代码示例

```javascript
// ❌ 错误：在回调中直接调用 SDK 函数
jsCallbacks.onDeviceConnected = (deviceId, connectionMode) => {
  SDK_getDeviceActive(deviceId)  // 可能导致问题
  SDK_getDeviceSN(deviceId)
}

// ✅ 正确：使用 setImmediate 异步调用
jsCallbacks.onDeviceConnected = (deviceId, connectionMode) => {
  // 缓存数据等轻量操作可以同步执行
  connectedDevices.set(deviceId, { ... })
  
  // SDK 调用推迟到下一个事件循环
  setImmediate(() => {
    SDK_getDeviceActive(deviceId)
    SDK_getDeviceSN(deviceId)
  })
}
```

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/main/services/sdk.js` | `onDeviceConnected`、`onDeviceMessage` 回调异步化 |
| `src/main/ipc/handlers.js` | 添加安全说明注释 |

## 相关 API

| API | 说明 |
|-----|------|
| `setImmediate(fn)` | 下一个事件循环周期执行 |
| `process.nextTick(fn)` | 当前操作完成后立即执行（比 setImmediate 更快） |
| `setTimeout(fn, 0)` | 类似 setImmediate，但优先级更低 |

本方案选用 `setImmediate`，确保回调快速返回的同时，后续操作能尽快执行。
