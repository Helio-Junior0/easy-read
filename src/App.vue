<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="barra-app">
    <RouterLink to="/" class="barra-app__titulo">Easy Read</RouterLink>
  </header>

  <main class="conteudo">
    <RouterView />
  </main>
</template>

<style scoped>
.barra-app {
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-height: 110px;
  padding: 1.75rem 3rem;
  background: var(--cor-primaria);
  border-bottom: 7px solid var(--cor-destaque);
}

.barra-app__titulo {
  color: var(--cor-texto-claro);
  font-size: 2.8rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  text-decoration: none;
  border: 0;
  outline: none;
}

.barra-app__titulo:hover {
  color: var(--cor-destaque);
}

.barra-app__titulo:focus-visible {
  outline: 2px solid var(--cor-destaque);
  outline-offset: 4px;
}

/* Sem limite de largura: a Home ocupa a tela inteira */
.conteudo {
  width: 100%;
  margin: 0;
  padding: 0;
}

@media (max-width: 600px) {
  .barra-app {
    min-height: 83px;
    padding: 1.1rem 1.25rem;
  }

  .barra-app__titulo {
    font-size: 2.05rem;
  }
}
</style>