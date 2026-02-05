/**
 * 应用配置表
 * 定义各应用的客户端信息和网页地址
 * 用于打开本地应用或网页
 */

/**
 * 应用配置
 * - hasClient: 是否有客户端版本
 * - webUrl: 网页地址
 * - winExeName: Windows 可执行文件名（不含路径）
 * - macAppName: macOS 应用名称（.app）
 * - macBundleId: macOS 应用 Bundle ID（备用）
 */
export const APP_CONFIG = {
  // 即时通讯 / 社交
  QQ: {
    hasClient: true,
    webUrl: 'https://im.qq.com',
    winExeName: 'QQ.exe',
    macAppName: 'QQ.app',
    macBundleId: 'com.tencent.qq'
  },
  微信: {
    hasClient: true,
    webUrl: 'https://weixin.qq.com',
    winExeName: 'Weixin.exe,WeChat.exe',
    macAppName: '微信.app',
    macBundleId: 'com.tencent.xinWeChat'
  },
  钉钉: {
    hasClient: true,
    webUrl: 'https://www.dingtalk.com',
    winExeName: 'DingtalkLauncher.exe,DingTalkUpdater.exe',
    macAppName: 'DingTalk.app',
    macBundleId: '5ZSL2CJU2T.com.dingtalk.mac'
  },
  飞书: {
    hasClient: true,
    webUrl: 'https://www.feishu.cn',
    winExeName: 'Lark.exe',
    macAppName: '飞书.app',
    macBundleId: 'com.bytedance.lark'
  },
  企业微信: {
    hasClient: true,
    webUrl: 'https://work.weixin.qq.com',
    winExeName: 'WXWork.exe',
    macAppName: '企业微信.app',
    macBundleId: 'com.tencent.WeWorkMac'
  },

  // 长视频 / 影音娱乐
  爱奇艺: {
    hasClient: true,
    webUrl: 'https://www.iqiyi.com',
    winExeName: 'QyClient.exe',
    macAppName: '爱奇艺.app',
    macBundleId: 'com.iqiyi.player'
  },
  腾讯视频: {
    hasClient: true,
    webUrl: 'https://v.qq.com',
    winExeName: 'QQLive.exe',
    macAppName: '腾讯视频.app',
    macBundleId: 'com.tencent.tenvideo'
  },
  优酷视频: {
    hasClient: true,
    webUrl: 'https://www.youku.com',
    winExeName: 'YoukuDesktop.exe',
    macAppName: '优酷.app',
    macBundleId: 'com.youku.mac'
  },
  芒果TV: {
    hasClient: true,
    webUrl: 'https://www.mgtv.com',
    winExeName: 'MGTV.exe',
    macAppName: '芒果TV.app',
    macBundleId: 'com.hunantv.mgtv'
  },
  哔哩哔哩: {
    hasClient: true,
    webUrl: 'https://www.bilibili.com',
    winExeName: 'bilibili.exe',
    macAppName: '哔哩哔哩.app',
    macBundleId: 'com.bilibili.app.bilibili'
  },

  // 短视频 / 内容娱乐
  抖音: {
    hasClient: true,
    webUrl: 'https://www.douyin.com',
    winExeName: 'Douyin.exe',
    macAppName: '抖音.app',
    macBundleId: 'com.bytedance.douyin'
  },
  快手: {
    hasClient: true,
    webUrl: 'https://www.kuaishou.com',
    winExeName: 'KwaiPC.exe',
    macAppName: '快手.app',
    macBundleId: 'com.kuaishou.kwai'
  },

  // 音乐 / 音频
  QQ音乐: {
    hasClient: true,
    webUrl: 'https://y.qq.com',
    winExeName: 'QQMusic.exe',
    macAppName: 'QQ音乐.app',
    macBundleId: 'com.tencent.QQMusicMac'
  },
  网易云音乐: {
    hasClient: true,
    webUrl: 'https://music.163.com',
    winExeName: 'cloudmusic.exe',
    macAppName: 'NeteaseMusic.app',
    macBundleId: 'com.netease.163music'
  },
  酷狗音乐: {
    hasClient: true,
    webUrl: 'https://www.kugou.com',
    winExeName: 'KuGou.exe',
    macAppName: '酷狗音乐.app',
    macBundleId: 'com.kugou.mac'
  },
  喜马拉雅: {
    hasClient: true,
    webUrl: 'https://www.ximalaya.com',
    winExeName: 'ximalaya.exe',
    macAppName: '喜马拉雅.app',
    macBundleId: 'com.ximalaya.audio'
  },
  懒人听书: {
    hasClient: true,
    webUrl: 'https://www.lrts.me',
    winExeName: 'lrts.exe',
    macAppName: '懒人听书.app',
    macBundleId: 'com.lrts.listen'
  },

  // 电商
  淘宝: {
    hasClient: true,
    webUrl: 'https://www.taobao.com',
    winExeName: 'Taobao.exe',
    macAppName: '淘宝.app',
    macBundleId: 'com.taobao.taobao4mac'
  },
  京东: {
    hasClient: true,
    webUrl: 'https://www.jd.com',
    winExeName: 'JD.exe',
    macAppName: '京东.app',
    macBundleId: 'com.jd.mac'
  },
  拼多多: {
    hasClient: true,
    webUrl: 'https://www.pinduoduo.com',
    winExeName: 'pinduoduo.exe',
    macAppName: '拼多多.app',
    macBundleId: 'com.xunmeng.pinduoduo'
  },
  唯品会: {
    hasClient: true,
    webUrl: 'https://www.vip.com',
    winExeName: 'vip.exe',
    macAppName: '唯品会.app',
    macBundleId: 'com.vipshop.vipshop'
  },

  // 旅游 / 出行
  携程旅行: {
    hasClient: true,
    webUrl: 'https://www.ctrip.com',
    winExeName: 'ctrip.exe',
    macAppName: '携程旅行.app',
    macBundleId: 'ctrip.com.ctrip'
  },
  去哪儿旅行: {
    hasClient: true,
    webUrl: 'https://www.qunar.com',
    winExeName: 'qunar.exe',
    macAppName: '去哪儿旅行.app',
    macBundleId: 'com.qunar.qunar'
  },
  滴滴出行: {
    hasClient: true,
    webUrl: 'https://www.didiglobal.com',
    winExeName: 'DiDi.exe',
    macAppName: '滴滴出行.app',
    macBundleId: 'com.didi.passenger'
  },

  // 内容社区
  知乎: {
    hasClient: true,
    webUrl: 'https://www.zhihu.com',
    winExeName: 'Zhihu.exe',
    macAppName: '知乎.app',
    macBundleId: 'com.zhihu.zhihu'
  },
  小红书: {
    hasClient: true,
    webUrl: 'https://www.xiaohongshu.com',
    winExeName: 'xiaohongshu.exe',
    macAppName: '小红书.app',
    macBundleId: 'com.xingin.discover'
  },
  豆瓣: {
    hasClient: true,
    webUrl: 'https://www.douban.com',
    winExeName: 'douban.exe',
    macAppName: '豆瓣.app',
    macBundleId: 'com.douban.douban'
  },

  // 工具类
  百度网盘: {
    hasClient: true,
    webUrl: 'https://pan.baidu.com',
    winExeName: 'BaiduNetdisk.exe',
    macAppName: '百度网盘.app',
    macBundleId: 'com.baidu.netdisk'
  },
  夸克: {
    hasClient: true,
    webUrl: 'https://www.quark.cn',
    winExeName: 'Quark.exe',
    macAppName: '夸克.app',
    macBundleId: 'com.alibaba.Quark'
  },
  QQ浏览器: {
    hasClient: true,
    webUrl: 'https://browser.qq.com',
    winExeName: 'QQBrowser.exe',
    macAppName: 'QQ浏览器.app',
    macBundleId: 'com.tencent.QQBrowserLite'
  },
  剪映: {
    hasClient: true,
    webUrl: 'https://www.capcut.cn',
    winExeName: 'JianyingPro.exe',
    macAppName: '剪映专业版.app',
    macBundleId: 'com.lveditor.LVEditorMacOS'
  },
  扫描全能王: {
    hasClient: true,
    webUrl: 'https://www.camscanner.com',
    winExeName: 'CamScanner.exe',
    macAppName: '扫描全能王.app',
    macBundleId: 'com.intsig.CamScanner'
  },

  // 视频会议
  腾讯会议: {
    hasClient: true,
    webUrl: 'https://meeting.tencent.com',
    winExeName: 'wemeetapp.exe',
    macAppName: '腾讯会议.app',
    macBundleId: 'com.tencent.meeting'
  },

  // 邮箱
  QQ邮箱: {
    hasClient: true,
    webUrl: 'https://mail.qq.com',
    winExeName: 'QQMail.exe',
    macAppName: 'QQ邮箱.app',
    macBundleId: 'com.tencent.qqmail'
  },

  // 金融
  同花顺: {
    hasClient: true,
    webUrl: 'https://www.10jqka.com.cn',
    winExeName: 'THS.exe',
    macAppName: '同花顺.app',
    macBundleId: 'com.hexin.ths'
  },

  // 运动健康
  keep: {
    hasClient: true,
    webUrl: 'https://www.gotokeep.com',
    winExeName: 'Keep.exe',
    macAppName: 'Keep.app',
    macBundleId: 'com.gotokeep.Keep'
  },

  // 票务
  大麦: {
    hasClient: true,
    webUrl: 'https://www.damai.cn',
    winExeName: 'damai.exe',
    macAppName: '大麦.app',
    macBundleId: 'com.alibaba.damai'
  },

  // AI 助手
  豆包: {
    hasClient: true,
    webUrl: 'https://www.doubao.com',
    winExeName: 'Doubao.exe',
    macAppName: '豆包.app',
    macBundleId: 'com.bytedance.doubao'
  },
  腾讯元宝: {
    hasClient: true,
    webUrl: 'https://yuanbao.tencent.com',
    winExeName: 'Yuanbao.exe',
    macAppName: '腾讯元宝.app',
    macBundleId: 'com.tencent.yuanbao'
  },

  // 直播
  虎牙直播: {
    hasClient: true,
    webUrl: 'https://www.huya.com',
    winExeName: 'huya.exe',
    macAppName: '虎牙直播.app',
    macBundleId: 'com.huya.live'
  },

  // 招聘
  '58同城': {
    hasClient: true,
    webUrl: 'https://www.58.com',
    winExeName: '58.exe',
    macAppName: '58同城.app',
    macBundleId: 'com.wuba.wuba'
  },

  // K歌
  全民K歌: {
    hasClient: false,
    webUrl: 'https://kg.qq.com'
  },

  // 无客户端的应用（仅网页）
  高德地图: { hasClient: false, webUrl: 'https://ditu.amap.com/' },
  腾讯地图: { hasClient: false, webUrl: 'https://map.qq.com/' },
  百度地图: { hasClient: false, webUrl: 'https://map.baidu.com/' },
  唱吧: { hasClient: false, webUrl: 'https://changba.com/home.php' },
  西瓜视频: { hasClient: false, webUrl: 'https://www.douyin.com/jingxuan' },
  七猫小说: { hasClient: false, webUrl: 'https://www.qimao.com/' },
  支付宝: { hasClient: false, webUrl: 'https://www.alipay.com/' },
  美团: { hasClient: false, webUrl: 'https://www.meituan.com/' },
  今日头条: { hasClient: false, webUrl: 'https://www.toutiao.com/' },
  微博: { hasClient: false, webUrl: 'https://weibo.com/' },
  番茄免费小说: { hasClient: false, webUrl: 'https://www.changdunovel.com/' },
  大众点评: { hasClient: false, webUrl: 'https://account.dianping.com/' },
  百度: { hasClient: false, webUrl: 'https://www.baidu.com/' },
  新浪新闻: { hasClient: false, webUrl: 'https://news.sina.com.cn/' },
  红果短剧: { hasClient: false, webUrl: 'http://www.hongdoutv.com/' },
  闲鱼: { hasClient: false, webUrl: 'https://www.goofish.com/' },
  得物: { hasClient: false, webUrl: 'https://www.dewu.com/' },
  韩剧TV: { hasClient: false, webUrl: 'https://tv.hanju.com/' },
  贝壳找房: { hasClient: false, webUrl: 'https://ke.com/' },
  DeepSeek: { hasClient: false, webUrl: 'https://www.deepseek.com' },
  Kimi: { hasClient: false, webUrl: 'https://kimi.moonshot.cn' },
  飞猪旅行: { hasClient: false, webUrl: 'https://www.fliggy.com' },
  开心消消乐: { hasClient: false, webUrl: 'https://xxl.happyelements.com' },
  皮皮虾: { hasClient: false, webUrl: 'https://www.pipix.com' },
  Boss直聘: { hasClient: false, webUrl: 'https://www.zhipin.com' },
  汽车之家: { hasClient: false, webUrl: 'https://www.autohome.com.cn' },
  懂车帝: { hasClient: false, webUrl: 'https://www.dongchedi.com/' },
  微信读书: { hasClient: false, webUrl: 'https://weread.qq.com/' },
  帆书: { hasClient: false, webUrl: 'https://www.dushu365.com/' },
  美颜相机: { hasClient: false, webUrl: 'https://meiyan.meipai.com/' },
  黄油相机: { hasClient: false, webUrl: 'https://www.bybutter.com/' },
  无他相机: { hasClient: false, webUrl: 'https://www.wuta-cam.com/' }
}

/**
 * 根据应用名称获取配置
 * @param {string} appName - 应用名称
 * @returns {object|null} 应用配置
 */
export function getAppConfig(appName) {
  return APP_CONFIG[appName] || null
}

/**
 * 判断应用是否有客户端
 * @param {string} appName - 应用名称
 * @returns {boolean}
 */
export function hasClientApp(appName) {
  const config = APP_CONFIG[appName]
  return config ? config.hasClient : false
}

/**
 * 获取应用的网页地址
 * @param {string} appName - 应用名称
 * @returns {string|null}
 */
export function getAppWebUrl(appName) {
  const config = APP_CONFIG[appName]
  return config ? config.webUrl : null
}
