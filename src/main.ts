import { createApp } from 'vue'
import { createPinia } from 'pinia'
import "./style.css"
import PiniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import 'element-plus/dist/index.css'

const pinia = createPinia()
pinia.use(PiniaPluginPersistedstate)


const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')