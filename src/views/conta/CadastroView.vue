<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CaixaConta from '../../components/CaixaConta.vue'
import { cadastrar } from '../../services/contaService'

const route = useRoute()
const router = useRouter()

const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmacao = ref('')
const erro = ref('')
const enviando = ref(false)

const senhasDiferentes = computed(() => confirmacao.value.length > 0 && confirmacao.value !== senha.value)

async function enviar() {
  erro.value = ''
  enviando.value = true
  try {
    await cadastrar({ nome: nome.value, email: email.value, senha: senha.value, confirmacao: confirmacao.value })
    // Depois do cadastro, mostra os planos (a conta começa no Grátis)
    await router.replace({ name: 'planos', query: { boasVindas: '1' } })
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <CaixaConta titulo="Criar conta" subtitulo="Comece grátis. Leva menos de um minuto.">
    <form class="formulario" @submit.prevent="enviar">
      <label class="campo">
        <span>Nome</span>
        <input v-model="nome" type="text" autocomplete="name" maxlength="80" required autofocus />
      </label>

      <label class="campo">
        <span>E-mail</span>
        <input v-model="email" type="email" autocomplete="email" inputmode="email" required />
      </label>

      <label class="campo">
        <span>Senha</span>
        <input v-model="senha" type="password" autocomplete="new-password" minlength="6" required />
        <small>Pelo menos 6 caracteres.</small>
      </label>

      <label class="campo">
        <span>Confirmar senha</span>
        <input v-model="confirmacao" type="password" autocomplete="new-password" required />
        <small v-if="senhasDiferentes" class="campo__alerta">As senhas não são iguais.</small>
      </label>

      <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

      <button type="submit" class="botao-principal" :disabled="enviando">
        {{ enviando ? 'Criando conta…' : 'Criar conta' }}
      </button>

      <p class="alternativa">
        Já tem conta?
        <RouterLink :to="{ name: 'entrar', query: route.query }">Entrar</RouterLink>
      </p>
      <p class="aviso-local">
        Projeto acadêmico: a conta fica guardada só neste aparelho e não é enviada a nenhum servidor.
      </p>
    </form>
  </CaixaConta>
</template>

<style scoped>
.formulario {
  display: grid;
  gap: 1rem;
}

.campo__alerta {
  color: var(--cor-erro) !important;
  font-weight: 600 !important;
}
</style>
