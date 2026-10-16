<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { popularBancoSeVazio } from './services/seedService';
import { buscarTodosLivros } from './services/dbService';
import type { Livro } from './types/index';

const status = ref('Verificando banco de dados...');
const livros = ref<Livro[]>([]);

onMounted(async () => {
  try {
    const populou = await popularBancoSeVazio();
    status.value = populou ? 'Banco populado com dados de exemplo!' : 'Banco de dados já continha informações.';
    livros.value = await buscarTodosLivros();
  } catch (erro) {
    console.error(erro);
    status.value = 'Erro ao inicializar o banco de dados.';
  }
});
</script>

<template>
  <main style="padding: 2rem; font-family: sans-serif;">
    <h2>EasyRead</h2>
    <p><strong>Status:</strong> {{ status }}</p>

    <h3>Livros no Banco:</h3>
    <ul>
      <li v-for="livro in livros" :key="livro.id">
        <strong>{{ livro.titulo }}</strong> — {{ livro.autor }}
      </li>
    </ul>
  </main>
</template>