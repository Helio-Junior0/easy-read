<script setup lang="ts">
import { useRouter } from 'vue-router'

// Rota usada quando não há página anterior no app (ex.: link aberto direto)
const props = withDefaults(defineProps<{ fallback?: string }>(), {
  fallback: '/',
})

const router = useRouter()

function voltar() {
  if (window.history.state?.back) {
    router.back()
  } else {
    router.push(props.fallback)
  }
}
</script>

<template>
  <button type="button" class="botao-voltar" @click="voltar">
    <span aria-hidden="true">←</span> Voltar
  </button>
</template>

<style scoped>
.botao-voltar {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 0.9rem;
  margin-bottom: 1rem;
  font: inherit;
  font-weight: 600;
  color: var(--cor-primaria);
  background: transparent;
  border: 2px solid var(--cor-secundaria);
  border-radius: 999px;
  cursor: pointer;
}

.botao-voltar:hover {
  background: var(--cor-superficie);
}
</style>
