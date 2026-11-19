<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { admin, sair } from './services/adminService'
import { buscarOndeContinuar } from './services/leituraService'

const route = useRoute()
const router = useRouter()

// No leitor o cabeçalho não fica preso no topo: quem fica é a barra de leitura
const lendo = computed(() => route.name === 'leitor')

// Para onde "Modo Leitura" e "Continuar" levam: a próxima página do último livro lido
const continuar = ref<string | null>(null)

watch(
  () => route.fullPath,
  async () => {
    try {
      const onde = await buscarOndeContinuar()
      continuar.value = onde ? `/livro/${onde.livroId}/pagina/${onde.pagina}` : null
    } catch {
      continuar.value = null
    }
  },
  { immediate: true },
)

function sairDoAdmin() {
  sair()
  router.push('/')
}
</script>

<template>
  <header class="barra-app" :class="{ 'barra-app--solta': lendo }">
    <div class="barra-app__dentro">
      <RouterLink to="/" class="marca" aria-label="Easy Read, ir para a biblioteca">
        <span class="marca__simbolo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6.5c-1.6-1.2-3.8-1.8-6.5-1.8v12.6c2.7 0 4.9.6 6.5 1.8 1.6-1.2 3.8-1.8 6.5-1.8V4.7c-2.7 0-4.9.6-6.5 1.8Z" />
            <path d="M12 6.5v12.6" />
          </svg>
        </span>
        <span class="marca__texto">
          <span class="marca__nome">Easy Read</span>
          <span class="marca__lema">Leitura com IA</span>
        </span>
      </RouterLink>

      <nav class="menu" aria-label="Menu principal">
        <RouterLink to="/" class="menu__link" exact-active-class="menu__link--ativo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M4 5.2c2.6 0 4.8.5 6.9 1.7v12c-2.1-1.1-4.3-1.6-6.9-1.6V5.2Zm16 0v12.1c-2.6 0-4.8.5-6.9 1.6v-12c2.1-1.2 4.3-1.7 6.9-1.7Z" />
          </svg>
          Biblioteca
        </RouterLink>
        <RouterLink :to="continuar ?? '/'" class="menu__link" :class="{ 'menu__link--ativo': lendo }">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14c.6-1 3.4-1 4 0M3 13l2-6M21 13l-2-6" />
          </svg>
          Modo Leitura
        </RouterLink>
      </nav>

      <div class="barra-app__fim">
        <span v-if="admin.logado" class="selo-admin">Administrador</span>
        <RouterLink v-if="continuar && !lendo" :to="continuar" class="botao-continuar">Continuar</RouterLink>
      </div>
    </div>
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
  z-index: 20;
  color: var(--cor-texto-claro);
  background: var(--cor-primaria-escura);
}

.barra-app--solta {
  position: static;
}

.barra-app__dentro {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  max-width: 1240px;
  min-height: 84px;
  margin: 0 auto;
  padding: 0.75rem 2rem;
}

.marca {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  justify-self: start;
  color: inherit;
  text-decoration: none;
}

.marca__simbolo {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  background: color-mix(in srgb, var(--cor-secundaria) 55%, var(--cor-primaria-escura));
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
}

.marca__texto {
  display: grid;
  line-height: 1.1;
}

.marca__nome {
  font-family: var(--fonte-titulo);
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.marca__lema {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.8;
}

.menu {
  display: flex;
  gap: 0.5rem;
}

.menu__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 0.9rem;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  border-radius: 999px;
  opacity: 0.85;
}

.menu__link:hover,
.menu__link--ativo {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
}

.barra-app__fim {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.botao-continuar {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1.4rem;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: inherit;
  text-decoration: none;
  background: var(--cor-secundaria);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
}

.botao-continuar:hover {
  background: color-mix(in srgb, var(--cor-secundaria) 80%, #fff);
}

.selo-admin {
  padding: 0.3rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--cor-primaria-escura);
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
  top: 84px;
  align-self: start;
  min-height: calc(100svh - 84px);
  padding: 1.25rem 0.75rem;
  background: var(--cor-superficie);
  border-right: 1px solid var(--cor-borda);
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
  border-radius: 12px;
  cursor: pointer;
}

.lateral__link:hover {
  background: var(--cor-destaque);
}

.lateral__link--ativo,
.lateral__link--ativo:hover {
  color: var(--cor-texto-claro);
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
  font-size: 0.85rem;
  text-align: center;
}

.rodape-app a {
  color: var(--cor-texto-suave);
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
    border-bottom: 1px solid var(--cor-borda);
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

@media (max-width: 760px) {
  /* Marca e "Continuar" na primeira linha, menu na segunda */
  .barra-app__dentro {
    grid-template-columns: 1fr auto;
    gap: 0.35rem 0.75rem;
    min-height: 0;
    padding: 0.6rem 1rem 0.35rem;
  }

  .menu {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: center;
  }

  .menu__link {
    font-size: 0.92rem;
  }

  .marca__simbolo {
    width: 40px;
    height: 40px;
  }

  .marca__nome {
    font-size: 1.35rem;
  }

  .botao-continuar {
    padding: 0 1rem;
    font-size: 0.8rem;
  }

  .selo-admin {
    display: none;
  }
}
</style>
