<script setup>
import { ref } from 'vue'

// AI工具集页面

// 工具分类数据
const categories = [
  {
    id: 'office',
    name: 'AI办公工具',
    tools: [
      { name: 'AiPPT', desc: 'AI快速生成高质量PPT', url: 'https://www.aippt.cn/' },
      {
        name: '咔片PPT',
        desc: 'AI PPT制作工具，设计美化全流程自动化|test|AI PPT制作工具，设计美化全流程自动化',
        url: 'https://www.cappt.cc/?mtm_campaign=CZQD-aibot-zxsl-10008'
      },
      { name: '博思AIPPT', desc: 'PPT效率神器，AI一键生成PPT', url: 'https://www.bosir.cn/' },
      {
        name: '文多多AiPPT',
        desc: 'AI一键生成PPT，支持AI配图和智能资料整合',
        url: 'https://docmee.cn/'
      },
      { name: 'Pi-AI原生PPT', desc: 'AI演示文档创作与共享平台', url: 'https://pi.ai/' },
      {
        name: 'iSlide AIPPT',
        desc: 'AI一键设计精美PPT，只需一句标题',
        url: 'https://www.islide.cc/'
      },
      { name: '扣子PPT', desc: '扣子空间推出的AI一键生成PPT服务', url: 'https://www.coze.cn/' },
      { name: '讯飞智文', desc: '一键生成PPT和Word', url: 'https://turbodesk.xfyun.cn/' },
      { name: '稿定PPT', desc: '稿定推出的PPT模板资源库', url: 'https://www.gaoding.com/' },
      {
        name: '笔格AIPPT',
        desc: '高效的AI PPT生成工具',
        url: 'https://bigppt.cn/?hmmd=aibot?hmmd=aibot'
      },
      { name: '笔灵AIPPT', desc: '一键生成PPT和千字演讲稿', url: 'https://ibiling.cn/' },
      {
        name: '百度文库AI助手',
        desc: '基于文心一言的一站式智能文档助手',
        url: 'https://wenku.baidu.com/ai'
      },
      { name: 'Gamma', desc: 'AI幻灯片演示生成工具', url: 'https://gamma.app/' },
      {
        name: 'VoxDeck',
        desc: '创新的AI演示文稿生成工具',
        url: 'https://www.voxdeck.ai/?utm_source=dhvoxaibot'
      },
      {
        name: 'Napkin',
        desc: '将文本内容快速转换成演示图像的AI办公工具',
        url: 'https://www.napkin.ai/'
      },
      {
        name: 'PicDoc',
        desc: 'AI文本转图表工具，一键生成多种视觉图表',
        url: 'https://www.picdoc.cn/?utm_source=ai-bot.cn'
      },
      {
        name: 'AiBiao',
        desc: 'AI文生图表工具，支持生成柱状图、折线图、饼图等',
        url: 'https://www.aibiao.com/?utm_source=ai-bot.cn'
      },
      {
        name: '美图AI PPT',
        desc: '美图秀秀推出的免费在线AI生成PPT设计工具',
        url: 'https://design.meitu.com/'
      },
      {
        name: 'Kimi PPT助手',
        desc: 'Kimi全新自研的PPT助手，一键生成PPT',
        url: 'https://kimi.moonshot.cn/'
      },
      { name: '清言PPT', desc: '智谱清言联合AiPPT推出的PPT生成智能体', url: 'https://chatglm.cn/' },
      {
        name: '万兴智演',
        desc: '万兴科技推出的AI PPT和演示制作软件',
        url: 'https://www.wondershare.cn/'
      },
      { name: '歌者AI', desc: '彩漩PPT推出的AI PPT生成工具', url: 'https://www.gizai.cn/' },
      { name: 'ChatBA', desc: 'AI幻灯片生成工具', url: 'https://www.chatba.com/' },
      {
        name: 'Decktopus AI',
        desc: 'AI驱动的在线演示文稿生成器',
        url: 'https://www.decktopus.com/'
      },
      { name: 'Powerpresent AI', desc: 'AI演示文稿生成工具', url: 'https://powerpresent.ai/' },
      { name: '希沃白板', desc: '专为互动教学设计的AI课件生成器', url: 'https://www.seewo.com/' },
      { name: '秒出PPT', desc: '一键生成PPT，智能辅助编辑', url: 'https://www.miaochu.ppt/' },
      {
        name: 'GAIPPT',
        desc: 'AI智能美化PPT工具，上传PPT一键美化',
        url: 'https://www.gaippt.com/?utm_source=ai-bot.cn'
      },
      { name: 'beautiful.ai', desc: 'AI创建展示幻灯片', url: 'https://www.beautiful.ai/' },
      {
        name: '麦当秀MindShow',
        desc: 'AI在线PPT制作工具，支持Markdown等多种格式',
        url: 'https://mindshow.fun/'
      }
    ]
  },
  {
    id: 'writing',
    name: 'AI写作工具',
    tools: [
      { name: '蛙蛙写作', desc: 'AI小说和内容创作工具', url: 'https://wawawriter.com/' },
      {
        name: '讯飞绘文',
        desc: '免费AI写作工具，5分钟生成一篇原创稿|test|免费AI写作工具，5分钟生成一篇原创稿',
        url: 'https://turbodesk.xfyun.cn/'
      },
      { name: '笔灵AI写作', desc: '面向专业写作领域的AI写作工具', url: 'https://ibiling.cn/' },
      {
        name: '新华妙笔',
        desc: '新华社推出的体制内办公学习平台',
        url: 'https://miaobi.xinhuaskl.com/'
      },
      {
        name: '笔灵AI小说',
        desc: '笔灵推出的AI小说生成和创作工具',
        url: 'https://ai-bot.cn/sites/22626.html'
      },
      { name: '讯飞文书', desc: '国产大模型AI公文写作工具', url: 'https://gw.iflydocs.com/' },
      { name: 'Paperpal', desc: '英文论文写作助手', url: 'https://paperpal.com/' },
      {
        name: '稿定AI文案',
        desc: '小红书、公众号、短视频AI文案生成工具',
        url: 'https://www.gaoding.com/ai'
      },
      { name: '秘塔写作猫', desc: 'AI写作，文章自成', url: 'https://xiezuocat.com/' },
      {
        name: '光速写作',
        desc: 'AI写作、PPT生成工具，单篇最长15000字',
        url: 'https://www.ggszx.com/'
      },
      {
        name: '万能小in',
        desc: '3分钟4万字150+应用，只需标题，快速生成毕业论文',
        url: 'https://xiaoin.cn/'
      },
      { name: 'Notion AI', desc: 'Notion推出的AI内容创作助手', url: 'https://www.notion.so/ai' },
      { name: 'QuillBot', desc: 'AI英/德语写作润色和改进工具', url: 'https://quillbot.com/' },
      {
        name: '讯飞写作',
        desc: '科大讯飞推出的AI智能写作助手',
        url: 'https://huixie.iflytek.com/'
      },
      { name: '茅茅虫', desc: '一站式AI论文写作助手', url: 'https://www.mymmsc.cn/' },
      {
        name: 'FlowUs AI',
        desc: '在线文档平台息流推出的AI创作助手，类似于Notion AI',
        url: 'https://flowus.cn/ai'
      },
      {
        name: '深言达意',
        desc: '免费的词句查询智能写作辅助工具，输入模糊描述即可查找词句',
        url: 'https://www.shenyandayi.com/'
      },
      {
        name: '彩云小梦',
        desc: '彩云科技推出的智能AI故事写作工具',
        url: 'https://if.caiyunai.com/'
      }
    ]
  },
  {
    id: 'image',
    name: 'AI图像工具',
    tools: [
      { name: '即梦', desc: '抖音旗下免费AI图片创作工具', url: 'https://jimeng.jianying.com/' },
      { name: '绘蛙', desc: 'AI电商营销工具，免费生成商品图', url: 'https://www.huiwa.tech/' },
      {
        name: '稿定AI',
        desc: '一站式AI设计工具集，免费AI绘图、图片转AI绘画、AI抠图消除',
        url: 'https://www.gaoding.com/ai'
      },
      {
        name: 'LiblibAI·哩布哩布AI',
        desc: '国内领先的AI图像创作平台和模型社区',
        url: 'https://www.liblib.ai/'
      },
      {
        name: '阿贝智能',
        desc: '一站式AI绘本创作平台，副业变现必备',
        url: 'https://www.abeie.com/'
      },
      {
        name: '星流AI',
        desc: 'LiblibAI推出的一站式AI图像生成平台',
        url: 'https://www.xingliu.art/'
      },
      { name: 'Midjourney', desc: 'AI图像和插画生成工具', url: 'https://www.midjourney.com/' },
      {
        name: 'Stable Diffusion',
        desc: 'StabilityAI推出的文本到图像生成AI',
        url: 'https://stability.ai/'
      },
      {
        name: 'Civitai',
        desc: '免费的AI图像绘画作品和模型分享平台和社区',
        url: 'https://civitai.com/'
      },
      {
        name: '堆友AI反应堆',
        desc: '阿里旗下堆友推出的多风格AI绘画生成器',
        url: 'https://d.design/'
      },
      { name: '吐司AI', desc: 'AI绘画模型社区和在线生图平台', url: 'https://tusiart.com/' },
      {
        name: '可灵AI',
        desc: '快手推出的AI图像和视频创作平台',
        url: 'https://kling.kuaishou.com/'
      },
      {
        name: '通义万相',
        desc: '阿里推出的AI创意内容生成平台',
        url: 'https://tongyi.aliyun.com/wanxiang'
      },
      { name: 'AI改图神器', desc: 'AI万能图片在线编辑器', url: 'https://img.logosc.cn/' },
      { name: 'Krea AI', desc: '实时AI图像、视频生成和编辑平台', url: 'https://www.krea.ai/' },
      {
        name: '秒画',
        desc: '商汤科技推出的免费AI作画和图片生成平台',
        url: 'https://miaohua.sensetime.com/'
      },
      { name: 'WHEE', desc: '美图推出的AI图片和绘画创作生成平台', url: 'https://whee.com/' },
      { name: '奇域AI', desc: '中式审美国风AI绘画创作平台', url: 'https://www.qiyuai.net/' },
      {
        name: '触手AI绘画',
        desc: '免费专业的AI绘画/模型/分享平台',
        url: 'https://www.chushouai.com/'
      },
      { name: '造梦日记', desc: 'AI一下，妙笔生画', url: 'https://print.art/' },
      {
        name: 'Canva AI图像生成',
        desc: '在线设计工具Canva推出的AI图像生成工具',
        url: 'https://www.canva.com/ai'
      },
      {
        name: '超能画布',
        desc: '百度网盘推出的AI创意图像写真创作平台',
        url: 'https://pan.baidu.com/photasy/'
      },
      { name: 'Photoroom', desc: '在线AI图片编辑工具', url: 'https://www.photoroom.com/' },
      { name: 'Ribbet.ai', desc: '免费的多功能AI图片处理工具箱', url: 'https://ribbet.ai/' },
      {
        name: '悟空图像PhotoSir',
        desc: '新一代专业图像处理软件，更智能、更高效、更好用',
        url: 'https://www.photosir.com/'
      }
    ]
  },
  {
    id: 'video',
    name: 'AI视频工具',
    tools: [
      {
        name: '即梦AI',
        desc: '字节跳动推出的一站式AI创作平台',
        url: 'https://jimeng.jianying.com/'
      },
      { name: '绘蛙AI视频', desc: '绘蛙推出的AI图生视频工具', url: 'https://www.huiwa.tech/' },
      {
        name: '讯飞绘镜',
        desc: '科大讯飞推出的AI短视频创作平台',
        url: 'https://turbodesk.xfyun.cn/'
      },
      { name: 'Vidu', desc: '生数科技推出的AI视频生成大模型', url: 'https://www.vidu.studio/' },
      {
        name: '有言',
        desc: '一站式AI视频创作和3D数字人生成平台',
        url: 'https://www.youyan.space/'
      },
      {
        name: '白日梦',
        desc: 'AI视频创作平台，最长可生成六分钟的视频',
        url: 'https://www.ishare365.com/'
      },
      { name: '巨日禄', desc: '一站式AI动漫视频创作平台', url: 'https://www.jurilu.com/' },
      { name: '可灵AI', desc: '快手推出的AI视频生成工具', url: 'https://kling.kuaishou.com/' },
      { name: 'HeyGen', desc: 'AI数字人视频创作平台', url: 'https://www.heygen.com/' },
      {
        name: 'Higgsfield',
        desc: 'AI视频生成工具，支持专业运镜效果',
        url: 'https://higgsfield.ai/'
      },
      { name: '蝉镜', desc: 'AI数字人视频生成平台', url: 'https://www.chanjing.cc/' },
      { name: '智谱清影', desc: '智谱推出的免费AI视频生成工具', url: 'https://chatglm.cn/video' },
      {
        name: '海螺视频',
        desc: 'MiniMax公司推出的AI视频生成工具',
        url: 'https://hailuoai.com/video'
      },
      {
        name: '腾讯混元AI视频',
        desc: '腾讯推出的AI视频生成工具',
        url: 'https://hunyuan.tencent.com/'
      },
      {
        name: '通义万相AI视频',
        desc: '通义万相AI视频是阿里推出的',
        url: 'https://tongyi.aliyun.com/wanxiang'
      },
      { name: 'Pollo AI', desc: '一站式AI图像和视频创作平台', url: 'https://pollo.ai/' },
      { name: 'Sora', desc: 'OpenAI推出的AI视频生成模型', url: 'https://openai.com/sora' },
      {
        name: 'Runway',
        desc: 'AI视频工具，绿幕抠除、视频生成、动态捕捉等功能',
        url: 'https://runwayml.com/'
      },
      { name: 'Pika', desc: 'Pika Labs推出的AI视频生成和编辑工具', url: 'https://pika.art/' },
      { name: '腾讯智影', desc: '腾讯推出的AI智能创作工具', url: 'https://zenvideo.qq.com/' },
      {
        name: 'Dream Machine',
        desc: 'Luma AI推出的AI视频生成工具',
        url: 'https://lumalabs.ai/dream-machine'
      },
      { name: 'KreadoAI', desc: 'AI数字人视频营销创作平台', url: 'https://www.kreadoai.com/' },
      { name: '即创', desc: '抖音推出的一站式AI智能创作平台', url: 'https://aic.oceanengine.com/' },
      { name: 'Hedra', desc: 'AI对口型视频生成工具', url: 'https://www.hedra.com/' }
    ]
  },
  {
    id: 'agent',
    name: 'AI智能体',
    tools: [
      {
        name: '扣子-AI办公',
        desc: '全面免费开放，提供专业AI Agent服务',
        url: 'https://www.coze.cn/'
      },
      {
        name: 'Skywork',
        desc: '昆仑万维面向全球推出的天工超级智能体',
        url: 'https://www.skywork.com/'
      },
      { name: 'Flowith', desc: '画布式AI智能体工具', url: 'https://flowith.io/' },
      { name: 'Manus', desc: 'Monica团队推出的全球首款通用型 AI Agent', url: 'https://manus.ai/' },
      {
        name: 'Operator',
        desc: 'OpenAI推出的AI智能体，能推理、联网自主执行任务',
        url: 'https://openai.com/operator'
      },
      {
        name: '星辰Agent',
        desc: '科大讯飞推出的AI智能体开发平台',
        url: 'https://xingchen.iflytek.com/'
      },
      { name: 'Zeabur', desc: '专为氛围编程设计的云部署AI 智能体', url: 'https://zeabur.com/' },
      { name: 'MyShell', desc: '构建、共享和拥有AI Agents的开发平台', url: 'https://myshell.ai/' },
      {
        name: 'RoboNeo',
        desc: '美图推出的专注影像与设计的AI智能体',
        url: 'https://meitu.com/roboneo'
      },
      {
        name: 'MiniMax Agent',
        desc: 'MiniMax推出的通用型AI Agent',
        url: 'https://www.minimaxi.com/'
      },
      { name: 'Dia', desc: 'Arc 团队推出的 AI 原生浏览器', url: 'https://dia.com/' },
      { name: 'Lovart', desc: '首个专业AI设计Agent', url: 'https://lovart.ai/' },
      { name: 'Suna', desc: '全球首款通用型 AI Agent 开源项目', url: 'https://suna.ai/' },
      { name: 'Genspark', desc: '基于智能体的AI搜索引擎', url: 'https://genspark.ai/' },
      { name: 'Fellou', desc: 'Fellou AI 推出的首个Agentic浏览器', url: 'https://fellou.com/' }
    ]
  },
  {
    id: 'chat',
    name: 'AI聊天助手',
    tools: [
      { name: '豆包', desc: '字节跳动推出的免费AI智能助手', url: 'https://www.doubao.com/' },
      {
        name: '问小白',
        desc: '免费AI智能助手，支持DeepSeek满血版',
        url: 'https://wenxiaobai.com/'
      },
      {
        name: '讯飞星火',
        desc: 'AI智能助手，支持PPT生成、深度推理',
        url: 'https://xinghuo.xfyun.cn/'
      },
      { name: 'ChatGPT', desc: 'OpenAI旗下AI对话工具', url: 'https://chatgpt.com/' },
      { name: 'Claude', desc: 'Anthropic公司推出的对话式AI智能助手', url: 'https://claude.ai/' },
      { name: 'Kimi智能助手', desc: '月之暗面推出的AI智能助手', url: 'https://kimi.moonshot.cn/' },
      {
        name: 'DeepSeek',
        desc: '幻方量化推出的AI智能助手和开源大模型',
        url: 'https://chat.deepseek.com/'
      },
      { name: '腾讯元宝', desc: '腾讯推出的免费AI智能助手', url: 'https://yuanbao.tencent.com/' },
      {
        name: '通义',
        desc: '阿里推出的自研大模型，通情、达义，你的全能AI助手！',
        url: 'https://tongyi.aliyun.com/'
      },
      { name: 'MiniMax', desc: 'MiniMax推出的AI智能问答助手', url: 'https://www.minimaxi.com/' },
      {
        name: 'Gemini',
        desc: 'Google推出的AI聊天对话机器人Gemini',
        url: 'https://gemini.google.com/'
      },
      { name: 'Z.ai', desc: '智谱面向全球推出的最新模型体验平台', url: 'https://z.ai/' },
      {
        name: 'Qwen Chat',
        desc: '阿里通义推出的 Qwen 最新模型体验平台',
        url: 'https://chat.qwenlm.ai/'
      },
      {
        name: '文心一言',
        desc: '百度推出的基于文心大模型的AI智能助手',
        url: 'https://yiyan.baidu.com/'
      },
      { name: 'Grok', desc: '马斯克旗下xAI推出的人工智能助手', url: 'https://grok.com/' },
      { name: '智谱清言', desc: '智谱推出的全能AI助手', url: 'https://chatglm.cn/' },
      {
        name: '华为小艺',
        desc: '华为旗下小艺AI助手网页端，已接入DeepSeek-R1',
        url: 'https://xiaoyi.huawei.com/'
      },
      {
        name: '书生大模型',
        desc: '上海人工智能实验室推出的系列AI模型',
        url: 'https://internlm.org.cn/'
      },
      { name: 'Poe', desc: '问答社区Quora推出的问答机器人工具', url: 'https://poe.com/' },
      {
        name: '阶跃AI',
        desc: '阶跃星辰推出的支持多模态的AI聊天机器人',
        url: 'https://www.stepfun.com/'
      },
      { name: '百小应', desc: '百川智能推出的免费AI助手', url: 'https://www.baichuan-ai.com/' },
      { name: '天工AI', desc: '昆仑万维推出的AI智能助手', url: 'https://www.tiangong.cn/' },
      {
        name: 'Copilot',
        desc: '微软推出的网页版Copilot助手',
        url: 'https://copilot.microsoft.com/'
      },
      { name: 'Character.AI', desc: '创建虚拟角色并与其对话', url: 'https://beta.character.ai/' },
      {
        name: 'J1 Assistant',
        desc: '罗永浩旗下 Jarvis 项目推出的 AI 智能助手',
        url: 'https://j1.ai/'
      },
      { name: 'Meta AI助手', desc: 'Meta推出的免费AI聊天助手', url: 'https://www.meta.ai/' },
      {
        name: 'Bing新必应',
        desc: '微软推出的新版结合了ChatGPT功能的必应',
        url: 'https://www.bing.com/chat'
      },
      { name: 'Koko AI', desc: 'Seele公司推出的「AI+3D」情感陪伴产品', url: 'https://koko.ai/' },
      { name: 'Me.bot', desc: '心识宇宙推出的个性化AI伴侣产品', url: 'https://me.bot/' }
    ]
  },
  {
    id: 'audio',
    name: 'AI音频工具',
    tools: [
      {
        name: '魔音工坊',
        desc: 'AI配音工具，轻松配出媲美真人的声音',
        url: 'https://www.moyin.com/'
      },
      {
        name: '讯飞智作',
        desc: '科大讯飞推出的AI转语音和配音工具',
        url: 'https://turbodesk.xfyun.cn/'
      },
      { name: '听脑AI', desc: 'AI语音录音记录助手', url: 'https://itingnao.com/' },
      { name: 'Suno', desc: '高质量的AI音乐创作平台', url: 'https://suno.com/' },
      {
        name: '海绵音乐',
        desc: '字节跳动推出的免费AI音乐创作和发现平台',
        url: 'https://www.haimianyinyue.com/'
      },
      {
        name: '音疯',
        desc: '昆仑万维推出的AI音乐创作平台，一键生成原创歌曲',
        url: 'https://yinfeng.kunlun.com/'
      },
      {
        name: 'ElevenLabs',
        desc: 'AI文本转语音，支持包含中文在内的28种语言',
        url: 'https://elevenlabs.io/'
      },
      { name: '琅琅配音', desc: '智能文本转语音工具', url: 'https://www.lang123.com/' },
      {
        name: '千音漫语',
        desc: 'AI声音创作助手，支持声音克隆',
        url: 'https://qianyin.kunlun.com/'
      },
      { name: 'Noiz AI', desc: 'AI配音工具，支持文本转语音和声音克隆', url: 'https://noiz.ai/' },
      {
        name: 'MiniMax Audio',
        desc: 'MiniMax推出的AI语音合成工具，支持声音克隆',
        url: 'https://www.minimaxi.com/'
      },
      { name: 'Mureka', desc: '昆仑万维推出的 AI 音乐商用创作平台', url: 'https://mureka.ai/' },
      {
        name: '天谱乐',
        desc: '唱鸭团队推出的首个多模态音乐生成大模型',
        url: 'https://tianpuyue.com/'
      },
      {
        name: '音剪',
        desc: '喜马拉雅推出的一站式AI音频创作平台',
        url: 'https://www.ximalaya.com/yinjian/'
      },
      {
        name: '简单听记',
        desc: '百度网盘推出的AI语音转文字工具',
        url: 'https://pan.baidu.com/photasy/'
      },
      {
        name: '讯飞听见',
        desc: '科大讯飞推出的在线AI语音转文字工具',
        url: 'https://www.iflyrec.com/'
      },
      { name: 'MemoAI', desc: '免费的AI语音转文字工具', url: 'https://memo.ac/' },
      { name: 'Reecho睿声', desc: '超拟真的中英文AI语音克隆/生成平台', url: 'https://reecho.ai/' },
      {
        name: 'Udio',
        desc: '免费的AI音乐创作工具，每月可生成1200首歌曲',
        url: 'https://www.udio.com/'
      },
      { name: '网易天音', desc: '网易推出的一站式AI音乐创作工具', url: 'https://tianyin.163.com/' },
      {
        name: 'TME Studio',
        desc: '腾讯音乐推出的智能音乐创作助手',
        url: 'https://y.qq.com/tme_studio/'
      },
      {
        name: 'Lyrics Into Song AI',
        desc: '在线AI音乐创作工具，输入歌词创建个性化歌曲',
        url: 'https://lyricsintosong.ai/'
      },
      {
        name: 'Stable Audio',
        desc: 'Stability AI最新推出的音乐生成工具',
        url: 'https://stableaudio.com/'
      },
      { name: 'TextToSpeech', desc: '完全免费的AI文字转语音工具', url: 'https://texttospeech.io/' },
      {
        name: 'TTSMaker',
        desc: '马克配音（MakVoice）推出的免费AI文字转语音工具',
        url: 'https://ttsmaker.com/'
      },
      {
        name: 'LOVO AI',
        desc: '专业的AI文字转语音工具，支持500+声音和100种语言',
        url: 'https://lovo.ai/'
      },
      {
        name: 'Uberduck',
        desc: '开源的AI语音生成社区，5000多种不同的声音',
        url: 'https://uberduck.ai/'
      },
      { name: 'Sonauto', desc: '免费的AI音乐生成和歌曲创作工具', url: 'https://sonauto.ai/' },
      {
        name: '天工SkyMusic',
        desc: '昆仑万维发布的国内首个AI音乐生成大模型',
        url: 'https://sky-music.tiangong.cn/'
      },
      {
        name: '大饼AI变声',
        desc: '免费专业的AI变声软件，一键实时语音变声|test|支持多种声音|实时语音变声|专业音质',
        url: 'https://dianbing.cn/'
      }
    ]
  }
]

// 当前激活的分类ID
const activeCategory = ref('office')

// el-scrollbar ref
const scrollbarRef = ref(null)

// 分类区块的refs
const categoryRefs = ref({})

// 是否正在程序滚动（防止滚动事件触发时更新激活状态）
let isScrolling = false

// 点击左侧分类，滚动到对应区域
const scrollToCategory = (categoryId) => {
  const targetEl = categoryRefs.value[categoryId]
  if (targetEl && scrollbarRef.value) {
    isScrolling = true
    activeCategory.value = categoryId
    // 获取目标元素相对于滚动容器的位置
    const targetTop = targetEl.offsetTop
    // 使用 wrapRef 的 scrollTo 实现平滑滚动
    const wrapRef = scrollbarRef.value.wrapRef
    if (wrapRef) {
      wrapRef.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      })
    }
    // 滚动完成后重置标志
    setTimeout(() => {
      isScrolling = false
    }, 500)
  }
}

// 滚动时更新激活的分类
const handleScroll = () => {
  if (isScrolling) return

  const wrapRef = scrollbarRef.value?.wrapRef
  if (!wrapRef) return

  const scrollTop = wrapRef.scrollTop
  const containerHeight = wrapRef.clientHeight
  const centerOffset = scrollTop + containerHeight / 2

  let closestCategory = null
  let closestDistance = Infinity

  // 找到距离视口中心最近的分类
  for (const category of categories) {
    const el = categoryRefs.value[category.id]
    if (el) {
      const elCenter = el.offsetTop + el.offsetHeight / 2
      const distance = Math.abs(elCenter - centerOffset)

      if (distance < closestDistance) {
        closestDistance = distance
        closestCategory = category.id
      }
    }
  }

  if (closestCategory && closestCategory !== activeCategory.value) {
    activeCategory.value = closestCategory
  }
}

// 打开工具网址
const openToolUrl = (url) => {
  window.open(url, '_blank')
}

// 判断文本是否可能超出两行（简单估算）
const isTextOverflow = (text) => {
  // 卡片内容区域大约能显示约30个中文字符（两行）
  return text && text.length > 30
}

// 设置分类区块ref
const setCategoryRef = (el, categoryId) => {
  if (el) {
    categoryRefs.value[categoryId] = el
  }
}
</script>

<template>
  <div class="wh-full px-58 py-28 flex select-none">
    <!-- 左侧分类导航 -->
    <div class="bg-#1B2023 py-16 pl-32 pr-68 rd-8 text-14 shrink-0">
      <div
        v-for="(category, index) in categories"
        :key="category.id"
        class="cursor-pointer whitespace-nowrap transition-colors duration-200"
        :class="[
          activeCategory === category.id ? 'color-#8BE6B0' : 'color-#606C80',
          index ? 'mt-16' : ''
        ]"
        @click="scrollToCategory(category.id)"
      >
        {{ category.name }}
      </div>
    </div>
    <!-- 右侧工具列表滚动区域 -->
    <el-scrollbar ref="scrollbarRef" class="flex-1 ml-16" @scroll="handleScroll">
      <!-- 各分类工具组 -->
      <div class="pr-20">
        <div
          v-for="(category, catIndex) in categories"
          :key="category.id"
          :ref="(el) => setCategoryRef(el, category.id)"
          :class="catIndex ? 'mt-32' : ''"
        >
          <!-- 分类标题 -->
          <div class="text-18 color-#fff mb-16">{{ category.name }}</div>
          <!-- 工具卡片网格 -->
          <div class="w-full flex flex-wrap gap-16">
            <div
              v-for="tool in category.tools"
              :key="tool.name"
              class="w-[calc((100%-48px)/4)] h-90 rd-8 bg-#1B2023 p-12 flex cursor-pointer hover:bg-#252A2D transition-colors duration-200"
              @click="openToolUrl(tool.url)"
            >
              <div class="h-full w-32 mr-12">
                <!-- 工具名称首字作为图标 -->
                <div class="w-32 h-32 bg-#101010 color-#fff rd-16 f-c-c text-14">
                  {{ tool.name.charAt(0) }}
                </div>
              </div>
              <div class="flex-1 flex flex-col justify-between overflow-hidden">
                <div class="text-14 color-#fff truncate">{{ tool.name }}</div>
                <el-tooltip
                  :content="tool.desc"
                  placement="top"
                  effect="light"
                  popper-class="tool-tooltip"
                  :disabled="!isTextOverflow(tool.desc)"
                  :show-after="50"
                >
                  <div class="text-12 color-#606C80 tool-desc">{{ tool.desc }}</div>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped>
/* 自定义 el-scrollbar 滚动条颜色 */
:deep(.el-scrollbar__bar) {
  opacity: 1;
}

:deep(.el-scrollbar__thumb) {
  background-color: rgba(255, 255, 255, 0.3);
}

:deep(.el-scrollbar__thumb:hover) {
  background-color: rgba(255, 255, 255, 0.5);
}

/* 描述文字最多两行，超出显示省略号 */
.tool-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  /* line-height: 1.4; */
}
</style>

<!-- 全局样式，用于自定义 tooltip -->
<style>
.tool-tooltip.el-popper.is-light {
  background-color: #fff;
  color: #000000;
  width: 200px;
  padding: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.tool-tooltip.el-popper.is-light .el-popper__arrow::before {
  background-color: #fff;
  border: none;
}
</style>
