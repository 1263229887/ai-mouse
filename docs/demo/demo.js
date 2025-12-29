var msg = 'hello world';
console.log(msg);
const koffi = require('koffi');
const libm = koffi.load('bydm.dll'); 

//sdk初始化
const SDK_sdkInit = libm.func('void sdkInit(bool debug)');  
const SDK_sdkClose = libm.func('void sdkClose(void)');

const SDK_getVoiceKey = libm.func('int getVoiceKey(void)');
const SDK_setVoiceKey = libm.func('void setVoiceKey(int index)');

const SDK_setDpiFilter = libm.func('void setDpiFilter(int* filter, int length, int dpi)');

//注册设备连接
const OnDeviceConnectedCallbackPro = koffi.proto('void OnDeviceConnectedCallback(const char* deviceId, int connectionMode)');
const SDK_registerDeviceConnectedListener = libm.func('registerDeviceConnectedCallbackListener', 'void', [koffi.pointer(OnDeviceConnectedCallbackPro)]);

//注册设备断开
const OnDeviceDisconnectedCallbackPro = koffi.proto('void OnDeviceDisconnectedCallback(const char* deviceId, int connectionMode)');
const SDK_registerDeviceDisconnectedListener = libm.func('registerDeviceDisconnectedCallbackListener', 'void', [koffi.pointer(OnDeviceDisconnectedCallbackPro)]);

//注册设备消息
const OnDeviceMessageCallbackPro = koffi.proto('void OnDeviceMessageCallback(const char* deviceId, const char* data)');
const SDK_registerDeviceMessageListener = libm.func('registerDeviceMessageCallbackListener', 'void', [koffi.pointer(OnDeviceMessageCallbackPro)]);

//注册音频数据
const OnDeviceAudioDataCallbackPro = koffi.proto('void OnDeviceAudioDataCallback(const char* deviceId, unsigned char* data, int length)');
const SDK_registerDeviceAudioDataListener = libm.func('registerDeviceAudioDataCallbackListener', 'void', [koffi.pointer(OnDeviceAudioDataCallbackPro)]);

//获取设备名称
const SDK_getDeviceName = libm.func('const char* getDeviceName(const char* deviceId)');

//获取设备数量
const SDK_getConnectedDeviceCount = libm.func('int getConnectedDeviceCount(void)');

//获取设备连接方式
const SDK_getConnectionMode = libm.func('int getConnectionMode(const char* deviceId)');

//获取设备在线状态
const SDK_getDeviceActive = libm.func('bool getDeviceActive(const char* deviceId)');

//获取接收器版本号
const SDK_getDongleSN = libm.func('bool getDongleSN(const char* deviceId)');

//获取接收器版本号
const SDK_getDongleVersion = libm.func('bool getDongleVersion(const char* deviceId)');

//获取接收器版本号
const SDK_getDeviceSN = libm.func('bool getDeviceSN(const char* deviceId)');

//获取接收器版本号
const SDK_getDeviceVersion = libm.func('bool getDeviceVersion(const char* deviceId)');

const SDK_getDeviceAllDpi = libm.func('bool getDeviceAllDpi(const char* deviceId)');
const SDK_setDeviceDpi = libm.func('bool setDeviceDpi(const char* deviceId, int max, int currentLevel, int currentValue)');

const SDK_getDeviceBattery = libm.func('bool getDeviceBattery(const char* deviceId)');


//获取设备音频状态
const SDK_getAudioEnable = libm.func('bool getAudioEnable(const char* deviceId)');

//设置设备音频状态
const SDK_setDeviceMicrophoneEnable = libm.func('bool setDeviceMicrophoneEnable(const char* deviceId, int enable)');

//设备连接消息
const OnDeviceConnected = function(deviceId, connectionMode) {
    console.log('OnDeviceConnected: deviceId ' + deviceId + ', connectionMode ' + connectionMode);

    console.log('DeviceName: ' + SDK_getDeviceName(deviceId));
    SDK_getDeviceActive(deviceId);
    SDK_getDongleSN(deviceId);
    SDK_getDongleVersion(deviceId);
    SDK_getDeviceSN(deviceId);
    SDK_getDeviceVersion(deviceId);

    console.log(SDK_getConnectionMode(deviceId));
	
	SDK_getDeviceAllDpi(deviceId);
	console.log(SDK_setDeviceDpi(deviceId, 3, 2, 1600));

    SDK_setDpiFilter(null, 0, 1200);
    SDK_getDeviceAllDpi(deviceId);
    console.log(SDK_setDeviceDpi(deviceId, 8, 6, 3200));

    //SDK_getAudioEnable(deviceId);
    //SDK_setDeviceMicrophoneEnable(deviceId, 1);    
}

//设备断开消息
const OnDeviceDisconnected = function(deviceId, connectionMode) {
    console.log('OnDeviceDisconnected: deviceId ' + deviceId + ", connectionMode " + connectionMode);
}

//设备消息
const OnDeviceMessage = function(deviceId, data) {
    console.log('OnDeviceMessage: deviceId ' + deviceId + ", Message: " + data);
}

//音频数据
const onDeviceAudioData = function(deviceId, data, length) {
    console.log('OnDeviceAudioData: deviceId ' + deviceId + ', length ' + length);
    let audioData = koffi.decode(data, 'unsigned char', length);
    console.log('OnDeviceAudioData: deviceId ' + deviceId + ', audioData ' + audioData);
}

SDK_sdkInit(true);
SDK_setDpiFilter([800, 1200, 1600], 3, 1200);
let DeviceConnectedCallback = koffi.register(OnDeviceConnected, 'OnDeviceConnectedCallback *');
SDK_registerDeviceConnectedListener(DeviceConnectedCallback);
let DeviceDisconnectedCallback = koffi.register(OnDeviceDisconnected, 'OnDeviceDisconnectedCallback *');
SDK_registerDeviceDisconnectedListener(DeviceDisconnectedCallback);
let DeviceMessageCallback = koffi.register(OnDeviceMessage, 'OnDeviceMessageCallback *');
SDK_registerDeviceMessageListener(DeviceMessageCallback);
let DeviceAudioDataCallback = koffi.register(onDeviceAudioData, 'OnDeviceAudioDataCallback *');
SDK_registerDeviceAudioDataListener(DeviceAudioDataCallback);


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function asyncSleep(ms) {
    console.log('wait start...');
    await sleep(ms);
    console.log('wait stop...');
}
asyncSleep(1000000000);

process.on('SIGINT', () => {
    SDK_sdkClose();
    process.exit(0);
});
