<script setup lang="ts">
import { onMounted } from 'vue';
import { db } from './db/index';

onMounted(async () => {
  await db.livros.toArray();
  console.log('Base de dados EasyReadDB inicializada com sucesso!');
});
</script>

<template>
  <main style="padding: 2rem; font-family: sans-serif;">
    <h1>Easy Read</h1>
    <p>Base de dados inicializada localmente.</p>
  </main>
</template>