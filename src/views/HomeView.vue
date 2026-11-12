<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { baixarLivro, listarBiblioteca, type ItemBiblioteca } from '../services/livroService'

const router = useRouter()

// Livros do catálogo (public/livros/catalogo.json) + quais já estão baixados no aparelho
const livros = ref<ItemBiblioteca[]>([])
const carregando = ref(true)
const erro = ref('')
const baixando = ref<string | null>(null) // slug do livro sendo baixado

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    livros.value = await listarBiblioteca()
  } catch (e) {
    console.error('Erro ao carregar a biblioteca:', e)
    erro.value = 'Não foi possível carregar os livros.'
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

async function baixar(item: ItemBiblioteca) {
  baixando.value = item.slug
  erro.value = ''
  try {
    const livro = await baixarLivro(item)
    await router.push(`/livro/${livro.id}/pagina/1`)
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    baixando.value = null
  }
}

// Filtros montados a partir das categorias que existem no catálogo
const filtros = computed(() => {
  const categorias = new Set(livros.value.map((l) => l.categoria).filter((c): c is string => !!c))
  return ['Todos', ...[...categorias].sort()]
})

const filtroAtivo = ref('Todos')
const busca = ref('')

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const livrosFiltrados = computed(() => {
  const termo = normalizar(busca.value)

  return livros.value.filter((l) => {
    const naCategoria =
      filtroAtivo.value === 'Todos' || l.categoria === filtroAtivo.value

    const naBusca =
      termo === '' ||
      normalizar(`${l.titulo} ${l.autor}`).includes(termo)

    return naCategoria && naBusca
  })
})

const contagem = computed(() => {
  const n = livrosFiltrados.value.length
  return `${n} ${n === 1 ? 'livro disponível' : 'livros disponíveis'}`
})
</script>

<template>
  <section class="home">
    <header class="topo">
      <div>
        <h1 class="titulo">Biblioteca</h1>
        <p class="subtitulo">Baixe um livro, leia no seu ritmo e revise o que leu com resumo e quiz.</p>
      </div>
      <span class="contagem">{{ contagem }}</span>
    </header>

    <div class="busca">
      <input
        v-model="busca"
        type="search"
        class="busca__campo"
        placeholder="Pesquisar por título ou autor"
        aria-label="Pesquisar livros"
      />
    </div>

    <nav v-if="filtros.length > 2" class="filtros" aria-label="Categorias de livros">
      <button
        v-for="cat in filtros"
        :key="cat"
        type="button"
        class="filtro"
        :class="{ 'filtro--ativo': filtroAtivo === cat }"
        :aria-pressed="filtroAtivo === cat"
        @click="filtroAtivo = cat"
      >
        {{ cat }}
      </button>
    </nav>

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <p v-if="carregando" class="vazio">Carregando livros...</p>

    <p v-else-if="livrosFiltrados.length === 0" class="vazio">
      Nenhum livro encontrado com esses filtros.
    </p>

    <ul v-else class="colecao">
      <li v-for="livro in livrosFiltrados" :key="livro.slug">
        <article class="livro">
          <p v-if="livro.categoria" class="livro__categoria">{{ livro.categoria }}</p>
          <h2 class="livro__titulo">{{ livro.titulo }}</h2>
          <p class="livro__autor">por {{ livro.autor }}</p>
          <p v-if="livro.descricao" class="livro__descricao">{{ livro.descricao }}</p>
          <p v-if="livro.baixado" class="livro__selo">Disponível offline · {{ livro.totalPaginas }} páginas</p>

          <RouterLink v-if="livro.baixado" :to="`/livro/${livro.livroId}`" class="livro__acao">
            <span>Abrir livro</span>
            <span aria-hidden="true">›</span>
          </RouterLink>
          <button
            v-else
            type="button"
            class="livro__acao"
            :disabled="baixando !== null"
            @click="baixar(livro)"
          >
            <span>{{ baixando === livro.slug ? 'Baixando…' : 'Iniciar leitura' }}</span>
            <span aria-hidden="true">›</span>
          </button>
        </article>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.home {
  max-width: 1240px;
  margin: 0 auto;
  padding: 2.5rem 2rem 3rem;
}

.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
}

.titulo {
  margin: 0 0 0.3rem;
  font-size: 2.4rem;
}

.subtitulo {
  margin: 0;
  color: var(--cor-texto-suave);
}

.contagem {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--cor-texto-suave);
  white-space: nowrap;
}

.busca {
  margin-bottom: 1rem;
}

.busca__campo {
  width: 100%;
  min-height: 50px;
  padding: 0 1.25rem;
  font: inherit;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 999px;
  outline: none;
  transition: border-color 0.15s;
}

.busca__campo:focus {
  border-color: var(--cor-primaria);
}

.filtros {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.25rem 0;
  overflow-x: auto;
}

.filtro {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 1.1rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--cor-texto);
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 999px;
  cursor: pointer;
}

.filtro--ativo {
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
  border-color: var(--cor-primaria);
}

.vazio {
  margin: 0;
  color: var(--cor-texto-suave);
}

.erro {
  margin: 0 0 1.25rem;
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: var(--cor-erro);
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-left: 4px solid var(--cor-erro);
  border-radius: 12px;
}

.colecao {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 1.75rem;
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
}

.livro {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem 2rem 1.1rem;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 22px;
  transition: box-shadow 0.2s, transform 0.2s;
}

.livro:hover {
  box-shadow: var(--sombra);
  transform: translateY(-2px);
}

.livro__categoria {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cor-primaria);
}

.livro__titulo {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.livro__autor {
  margin: 0 0 1rem;
  color: var(--cor-texto-suave);
}

.livro__descricao {
  margin: 0 0 1rem;
  font-family: var(--fonte-titulo);
  font-size: 1.12rem;
  line-height: 1.5;
  color: #5b4a47;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.livro__selo {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cor-acerto);
}

.livro__acao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 52px;
  margin-top: auto;
  padding: 0.6rem 0 0;
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  text-align: left;
  text-decoration: none;
  background: none;
  border: 0;
  border-top: 1px solid var(--cor-borda);
  cursor: pointer;
}

.livro__acao span:last-child {
  font-size: 1.5rem;
  line-height: 1;
  transition: transform 0.15s;
}

.livro__acao:hover span:last-child {
  transform: translateX(4px);
}

.livro__acao:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 700px) {
  .home {
    padding: 1.5rem 1rem 2rem;
  }

  .titulo {
    font-size: 2rem;
  }

  .livro {
    padding: 1.4rem 1.4rem 0.8rem;
  }

  .colecao {
    gap: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .livro,
  .livro__acao span:last-child {
    transition: none;
  }

  .livro:hover {
    transform: none;
  }
}
</style>
