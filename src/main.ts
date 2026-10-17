import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { popularBancoSeVazio } from './services/seedService'

async function iniciarApp() {
  try {
    await popularBancoSeVazio()
  } catch (erro) {
    console.error('Erro ao popular o banco de dados:', erro)
  }

  createApp(App).mount('#app')
}

iniciarApp()
