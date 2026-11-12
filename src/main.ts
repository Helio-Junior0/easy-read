import { createApp } from 'vue'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import './style.css'
import App from './App.vue'
import router from './router'

// Os livros não vêm mais prontos no banco: cada pessoa baixa pelo botão
// "Baixar livro" (ver src/services/livroService.ts).
createApp(App).use(router).mount('#app')
