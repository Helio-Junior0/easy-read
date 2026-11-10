import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Os livros não vêm mais prontos no banco: cada pessoa baixa pelo botão
// "Baixar livro" (ver src/services/livroService.ts).
createApp(App).use(router).mount('#app')
