<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { buscarTodosLivros } from '../services/dbService'
import type { Livro as LivroDB } from '../types'

const categorias = [
  'Romance',
  'Clássicos',
  'Realismo',
  'Suspense',
  'Aventura',
  'Infantil',
] as const

type Categoria = (typeof categorias)[number]

type Livro = LivroDB & {
  descricao?: string
  categoria?: Categoria
  capaUrl?: string
  capa?: string
}

// Substituída a lista fixa por buscarTodosLivros() do IndexedDB
const livros = ref<Livro[]>([])
const carregando = ref(true)

onMounted(async () => {
  try {
    livros.value = await buscarTodosLivros()
  } catch (error) {
    console.error('Erro ao buscar livros do banco:', error)
  } finally {
    carregando.value = false
  }
})

const filtros = ['Todos', ...categorias] as const
type Filtro = (typeof filtros)[number]

const filtroAtivo = ref<Filtro>('Todos')
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
  return `${n} ${n === 1 ? 'livro registrado' : 'livros registrados'}`
})
</script>

<template>
  <section class="home">
    <div class="busca">
      <input
        v-model="busca"
        type="search"
        class="busca__campo"
        placeholder="Pesquisar por título ou autor"
        aria-label="Pesquisar livros"
      />
    </div>

    <header class="topo">
      <div class="topo__texto">
        <h1 class="titulo">Seus livros</h1>
        <p class="subtitulo">Escolha um livro para ler resumos e testar o que aprendeu.</p>
      </div>
      <span class="contagem">{{ contagem }}</span>
    </header>

    <nav class="filtros" aria-label="Categorias de livros">
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

    <p v-if="carregando" class="vazio">
      Carregando livros...
    </p>

    <p v-else-if="livrosFiltrados.length === 0" class="vazio">
      Nenhum livro encontrado com esses filtros.
    </p>

    <ul v-else class="lista-cards">
      <li v-for="livro in livrosFiltrados" :key="livro.id">
        <RouterLink :to="`/livro/${livro.id}`" class="card">
          <!-- Imagem se existir capaUrl ou capa -->
          <img 
            v-if="livro.capaUrl || livro.capa" 
            class="card__capa" 
            :src="livro.capaUrl || livro.capa" 
            :alt="`Capa de ${livro.titulo}`" 
            loading="lazy" 
          />

          <!-- Fallback de capa desenhada em CSS caso não haja imagem -->
          <div v-else class="card__capa card__capa--css">
            <span class="card__capa-titulo">{{ livro.titulo }}</span>
            <span class="card__capa-autor">{{ livro.autor }}</span>
          </div>

          <div class="card__info">
            <span class="card__titulo">{{ livro.titulo }}</span>
            <span class="card__autor">{{ livro.autor }}</span>
            <span class="card__descricao">{{ livro.descricao }}</span>
            <span class="card__botao">Ler resumo →</span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.home {
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  box-sizing: border-box;
  padding: 2rem 3rem 3rem;
  text-align: left;
  overflow-x: hidden;
}

.busca {
  margin-bottom: 2rem;
}

.busca__campo {
  width: 100%;
  padding: 0.9rem 1.25rem;
  font: inherit;
  font-size: 1.05rem;
  background: var(--cor-superficie);
  border: 2px solid transparent;
  border-radius: 999px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.busca__campo:focus {
  border-color: var(--cor-primaria);
}

.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1.75rem;
}

.titulo {
  margin: 0 0 0.4rem;
  font-size: 2rem;
  line-height: 1.2;
}

.subtitulo {
  margin: 0;
  font-size: 1.05rem;
  opacity: 0.75;
}

.contagem {
  padding: 0.4rem 0.9rem;
  font-size: 0.95rem;
  font-weight: 600;
  background: var(--cor-superficie);
  border-radius: 999px;
  white-space: nowrap;
}

.filtros {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding: 0.25rem 0;
}

.filtro {
  flex-shrink: 0;
  padding: 0.6rem 1.25rem;
  font: inherit;
  font-size: 1rem;
  white-space: nowrap;
  background: var(--cor-superficie);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: filter 0.15s;
}

.filtro:hover {
  filter: brightness(0.97);
}

.filtro--ativo {
  background: var(--cor-primaria);
  color: #fff;
}

.vazio {
  margin: 0;
  font-size: 1.05rem;
  opacity: 0.75;
}

.lista-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
  gap: 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: start;
  gap: 1.5rem;
  height: 100%;
  padding: 1.25rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
  color: inherit;
  text-decoration: none;
  text-align: left;
  transition: transform 0.15s, box-shadow 0.15s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.card__capa {
  width: 150px;
  height: 210px;
  object-fit: cover;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
}

/* Fallback de capa em CSS utilizando a cor primária */
.card__capa--css {
  background: var(--cor-primaria);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0.75rem;
  text-align: center;
  box-sizing: border-box;
}

.card__capa-titulo {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;
}

.card__capa-autor {
  font-size: 0.8rem;
  opacity: 0.85;
  margin-top: 0.4rem;
}

.card__info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  height: 100%;
  text-align: left;
}

.card__titulo {
  font-weight: 700;
  font-size: 1.3rem;
  line-height: 1.3;
}

.card__autor {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--cor-primaria);
}

.card__descricao {
  font-size: 1rem;
  line-height: 1.55;
  opacity: 0.8;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__botao {
  margin-top: auto;
  padding: 0.85rem 1rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: var(--cor-primaria);
  border-radius: var(--raio);
}

/* Telas menores: uma coluna */
@media (max-width: 900px) {
  .home {
    padding: 1.5rem 1.25rem 2rem;
  }

  .lista-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .card {
    grid-template-columns: 110px 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .card__capa {
    width: 110px;
    height: 160px;
  }

  .card__titulo {
    font-size: 1.1rem;
  }

  .card__autor {
    font-size: 0.9rem;
  }

  .card__descricao {
    font-size: 0.95rem;
  }
}
</style>