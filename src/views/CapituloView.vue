<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'

defineProps<{ id: string }>()
</script>

<template>
  <section>
    <BotaoVoltar fallback="/" />

    <p class="rotulo">Capítulo #{{ id }}</p>
    <h1>Título do capítulo</h1>

    <article class="resumo">
      <h2>Resumo</h2>
      <p>
        Aqui vai aparecer o resumo do capítulo. Este é um texto provisório para
        visualizar o layout enquanto a leitura dos dados do banco não está pronta.
      </p>
    </article>

    <RouterLink :to="`/capitulo/${id}/quiz`" class="botao-principal">Fazer quiz</RouterLink>
  </section>
</template>

<style scoped>
.resumo {
  margin-bottom: 1.5rem;
  padding: 1rem 1.1rem;
  background: var(--cor-superficie);
  border-left: 4px solid var(--cor-destaque);
  border-radius: var(--raio);
}

.resumo h2 {
  margin-top: 0;
}

.resumo p {
  margin: 0;
}
</style>
