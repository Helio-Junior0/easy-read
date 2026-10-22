import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { popularBancoSeVazio } from './services/seedService'

async function iniciarApp() {
  try {
    await popularBancoSeVazio()
  } catch (erro) {
    console.error('Erro ao popular o banco de dados:', erro)
  }

  createApp(App).use(router).mount('#app')
}

iniciarApp()
