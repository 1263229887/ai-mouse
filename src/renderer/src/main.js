import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'

// SVG 图标注册
import 'virtual:svg-icons-register'
import SvgIcon from './components/SvgIcon/index.vue'

// 样式导入顺序很重要：先主题变量，再全局样式
import './styles/themes.scss'
import './styles/global.scss'

const app = createApp(App)
const pinia = createPinia()

// 全局注册 SvgIcon 组件
app.component('SvgIcon', SvgIcon)

app.use(pinia)
app.use(ElementPlus)
app.use(router)

app.mount('#app')
