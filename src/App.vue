<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { admin, sair } from './services/adminService'

const route = useRoute()
const router = useRouter()

// No leitor o cabeçalho não fica preso no topo, para sobrar espaço para o texto
const lendo = computed(() => route.name === 'leitor')

function sairDoAdmin() {
  sair()
  router.push('/')
}
</script>

<template>
  <header class="barra-app" :class="{ 'barra-app--solta': lendo }">
    <RouterLink to="/" class="barra-app__titulo">Easy Read</RouterLink>
    <span v-if="admin.logado" class="barra-app__selo">Administrador</span>
  </header>

  <div class="estrutura" :class="{ 'estrutura--admin': admin.logado }">
    <!-- Barra lateral: só para o administrador -->
    <aside v-if="admin.logado" class="lateral">
      <nav class="lateral__nav" aria-label="Menu do administrador">
        <RouterLink to="/" class="lateral__link" exact-active-class="lateral__link--ativo">Biblioteca</RouterLink>
        <RouterLink to="/admin/livros/novo" class="lateral__link" exact-active-class="lateral__link--ativo">
          Adicionar livro
        </RouterLink>
        <RouterLink to="/admin/livros" class="lateral__link" exact-active-class="lateral__link--ativo">
          Gerenciar livros
        </RouterLink>
        <button type="button" class="lateral__link lateral__sair" @click="sairDoAdmin">Sair</button>
      </nav>
    </aside>

    <main class="conteudo">
      <RouterView />
    </main>
  </div>

  <footer v-if="!admin.logado && !lendo" class="rodape-app">
    <RouterLink to="/admin/login">Área do administrador</RouterLink>
  </footer>
</template>

<style scoped>
.barra-app {
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-height: 110px;
  padding: 1.75rem 3rem;
  background: var(--cor-primaria);
  border-bottom: 7px solid var(--cor-destaque);
}

.barra-app--solta {
  position: static;
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

.barra-app__selo {
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--cor-texto);
  background: var(--cor-destaque);
  border-radius: 999px;
}

.estrutura--admin {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  align-items: start;
}

.lateral {
  position: sticky;
  top: 117px;
  align-self: start;
  min-height: calc(100svh - 117px);
  padding: 1.25rem 0.75rem;
  background: var(--cor-superficie);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.lateral__nav {
  display: grid;
  gap: 0.35rem;
}

.lateral__link {
  display: flex;
  align-items: center;
  min-height: 46px;
  padding: 0 0.9rem;
  font: inherit;
  font-weight: 600;
  color: var(--cor-texto);
  text-align: left;
  text-decoration: none;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

.lateral__link:hover {
  background: color-mix(in srgb, var(--cor-texto) 8%, transparent);
}

.lateral__link--ativo {
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
}

.lateral__link--ativo:hover {
  background: var(--cor-primaria);
}

.lateral__sair {
  margin-top: 0.75rem;
  color: var(--cor-primaria);
}

.conteudo {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
}

.rodape-app {
  padding: 1.5rem 1rem 2rem;
  font-size: 0.9rem;
  text-align: center;
  opacity: 0.8;
}

@media (max-width: 800px) {
  /* No celular a barra lateral vira uma faixa de atalhos no topo */
  .estrutura--admin {
    display: block;
  }

  .lateral {
    position: static;
    min-height: 0;
    padding: 0.5rem 0.75rem;
    border-right: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .lateral__nav {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
  }

  .lateral__link {
    flex-shrink: 0;
    min-height: 44px;
    padding: 0 0.65rem;
    font-size: 0.92rem;
    white-space: nowrap;
  }

  .lateral__sair {
    margin-top: 0;
  }
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
