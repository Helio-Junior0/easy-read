<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'
</script>

<template>
  <section>
    <BotaoVoltar fallback="/" />

    <h1>Página não encontrada</h1>
    <p>O endereço que você abriu não existe ou foi removido.</p>
    <p><RouterLink to="/">Voltar ao início</RouterLink></p>
  </section>
</template>
