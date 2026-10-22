<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="cabecalho">
    <div class="cabecalho__conteudo">
      <RouterLink to="/" class="cabecalho__marca">Easy Read</RouterLink>
    </div>
  </header>

  <main class="conteudo">
    <RouterView />
  </main>
</template>

<style scoped>
.cabecalho {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--cor-primaria);
  border-bottom: 4px solid var(--cor-destaque);
}

.cabecalho__conteudo {
  max-width: var(--largura-maxima);
  margin: 0 auto;
  padding: 0 1rem;
  min-height: 56px;
  display: flex;
  align-items: center;
}

.cabecalho__marca {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--cor-texto-claro);
  text-decoration: none;
}

.cabecalho__marca:hover {
  color: var(--cor-destaque);
}

.cabecalho__marca:focus-visible {
  outline-color: var(--cor-destaque);
}

.conteudo {
  max-width: var(--largura-maxima);
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
}
</style>
