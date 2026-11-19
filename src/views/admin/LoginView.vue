<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { entrar } from '../../services/adminService'

const route = useRoute()
const router = useRouter()

const senha = ref('')
const erro = ref('')
const enviando = ref(false)

async function enviar() {
  erro.value = ''
  enviando.value = true
  try {
    await entrar(senha.value)
    const destino = typeof route.query.voltar === 'string' ? route.query.voltar : '/admin/livros'
    router.replace(destino.startsWith('/admin') ? destino : '/admin/livros')
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="login">
    <form class="login__caixa" @submit.prevent="enviar">
      <p class="rotulo">Área do administrador</p>
      <h1>Entrar</h1>
      <p class="apoio">Só o administrador precisa entrar. Para ler os livros, não é preciso ter conta.</p>

      <label class="campo">
        <span>Senha</span>
        <input v-model="senha" type="password" autocomplete="current-password" required autofocus />
      </label>

      <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

      <button type="submit" class="botao-principal" :disabled="enviando || !senha">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.login {
  display: grid;
  justify-items: center;
  padding: 2.5rem 1rem 3rem;
}

.login__caixa {
  display: grid;
  gap: 1rem;
  width: 100%;
  max-width: 420px;
  padding: 1.75rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
}

.login__caixa h1,
.login__caixa .rotulo {
  margin: 0;
  justify-self: start;
}

.apoio {
  margin: 0;
  opacity: 0.8;
}

.campo {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
}

.campo input {
  min-height: 48px;
  padding: 0 0.9rem;
  font: inherit;
  background: var(--cor-fundo);
  border: 2px solid transparent;
  border-radius: 10px;
}

.campo input:focus {
  border-color: var(--cor-primaria);
  outline: none;
}

.erro {
  margin: 0;
  font-weight: 600;
  color: var(--cor-erro);
}

.login__caixa .botao-principal {
  width: 100%;
}
</style>
