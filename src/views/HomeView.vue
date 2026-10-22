<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Dados de exemplo: ainda não vêm do banco
const livros = [
  { id: 1, titulo: 'Dom Casmurro', autor: 'Machado de Assis' },
  { id: 2, titulo: 'Memórias Póstumas de Brás Cubas', autor: 'Machado de Assis' },
  { id: 3, titulo: 'O Cortiço', autor: 'Aluísio Azevedo' },
]
</script>

<template>
  <section>
    <h1>Seus livros</h1>
    <p class="subtitulo">Escolha um livro para ler resumos e testar o que aprendeu.</p>

    <ul class="lista-cards">
      <li v-for="livro in livros" :key="livro.id">
        <RouterLink :to="`/livro/${livro.id}`" class="card">
          <span class="card__titulo">{{ livro.titulo }}</span>
          <span class="card__autor">{{ livro.autor }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.subtitulo {
  margin: 0 0 1.5rem;
}

.card__autor {
  font-size: 0.95rem;
}
</style>
