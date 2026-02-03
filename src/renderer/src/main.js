import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'

// UnoCSS
import 'virtual:uno.css'

// SVG 图标注册
import 'virtual:svg-icons-register'
import SvgIcon from './components/SvgIcon/index.vue'

// 全局样式
import './styles/reset.css'

const app = createApp(App)
const pinia = createPinia()

// 全局注册 SvgIcon 组件
app.component('SvgIcon', SvgIcon)

app.use(pinia)
app.use(ElementPlus)
app.use(router)

app.mount('#app')
