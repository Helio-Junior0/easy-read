<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CaixaConta from '../../components/CaixaConta.vue'
import { entrar } from '../../services/contaService'

const route = useRoute()
const router = useRouter()

const email = ref('')
const senha = ref('')
const erro = ref('')
const enviando = ref(false)

function destino(): string {
  const voltar = route.query.voltar
  return typeof voltar === 'string' && voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : '/'
}

async function enviar() {
  erro.value = ''
  enviando.value = true
  try {
    await entrar(email.value, senha.value)
    await router.replace(destino())
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <CaixaConta titulo="Entrar" subtitulo="Bem-vindo de volta. Continue de onde parou.">
    <form class="formulario" @submit.prevent="enviar">
      <label class="campo">
        <span>E-mail</span>
        <input v-model="email" type="email" autocomplete="email" inputmode="email" required autofocus />
      </label>

      <label class="campo">
        <span>Senha</span>
        <input v-model="senha" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

      <button type="submit" class="botao-principal" :disabled="enviando">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>

      <p class="alternativa">
        Ainda não tem conta?
        <RouterLink :to="{ name: 'cadastro', query: route.query }">Criar conta grátis</RouterLink>
      </p>
      <p class="aviso-local">Sua conta fica guardada neste aparelho.</p>
    </form>
  </CaixaConta>
</template>

<style scoped>
.formulario {
  display: grid;
  gap: 1rem;
}
</style>
