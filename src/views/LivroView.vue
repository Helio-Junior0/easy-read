<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'

const props = defineProps<{ id: string }>()

// Capítulos de exemplo: ainda não vêm do banco
const capitulos = computed(() => {
  const base = (Number(props.id) - 1) * 3
  return [1, 2, 3].map((numero) => ({
    id: base + numero,
    numero,
    titulo: `Capítulo de exemplo ${numero}`,
  }))
})
</script>

<template>
  <section>
    <BotaoVoltar fallback="/" />

    <p class="rotulo">Livro #{{ id }}</p>
    <h1>Título do livro</h1>

    <h2>Capítulos</h2>
    <ul class="lista-cards">
      <li v-for="capitulo in capitulos" :key="capitulo.id">
        <RouterLink :to="`/capitulo/${capitulo.id}`" class="card">
          <span class="card__titulo">{{ capitulo.numero }}. {{ capitulo.titulo }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
