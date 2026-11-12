<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { LivroCatalogo } from '../../types'
import { excluirLivroDoCatalogo } from '../../services/adminService'
import { buscarCatalogo } from '../../services/livroService'

const route = useRoute()

const livros = ref<LivroCatalogo[]>([])
const carregando = ref(true)
const erro = ref('')
const aviso = ref(typeof route.query.adicionado === 'string' ? `"${route.query.adicionado}" foi adicionado e já aparece para os leitores.` : '')
const confirmando = ref<string | null>(null)
const excluindo = ref(false)

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    livros.value = await buscarCatalogo()
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

async function excluir(livro: LivroCatalogo) {
  excluindo.value = true
  erro.value = ''
  aviso.value = ''
  try {
    await excluirLivroDoCatalogo(livro.slug)
    aviso.value = `"${livro.titulo}" foi excluído do catálogo.`
    confirmando.value = null
    await carregar()
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    excluindo.value = false
  }
}
</script>

<template>
  <section class="admin">
    <header class="admin__topo">
      <div>
        <p class="rotulo">Administração</p>
        <h1>Livros do catálogo</h1>
      </div>
      <RouterLink to="/admin/livros/novo" class="botao-principal">Adicionar livro</RouterLink>
    </header>

    <p v-if="aviso" class="aviso" role="status">{{ aviso }}</p>
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <p v-if="carregando">Carregando…</p>

    <p v-else-if="livros.length === 0 && !erro">Nenhum livro no catálogo ainda.</p>

    <ul v-else class="lista">
      <li v-for="livro in livros" :key="livro.slug" class="item">
        <div class="item__info">
          <strong>{{ livro.titulo }}</strong>
          <span>{{ livro.autor }}<template v-if="livro.categoria"> · {{ livro.categoria }}</template></span>
        </div>

        <span v-if="livro.origem !== 'admin'" class="item__fixo">Vem com o app</span>

        <template v-else-if="confirmando === livro.slug">
          <span class="item__pergunta">Excluir para todos os leitores?</span>
          <button type="button" class="botao-item botao-item--perigo" :disabled="excluindo" @click="excluir(livro)">
            {{ excluindo ? 'Excluindo…' : 'Excluir' }}
          </button>
          <button type="button" class="botao-item" :disabled="excluindo" @click="confirmando = null">Cancelar</button>
        </template>

        <button v-else type="button" class="botao-item" @click="confirmando = livro.slug">Excluir</button>
      </li>
    </ul>

    <p class="nota">
      Quem já baixou um livro continua com ele no aparelho mesmo depois de excluído do catálogo.
    </p>
  </section>
</template>

<style scoped>
.admin {
  max-width: 860px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.admin__topo {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.admin__topo h1 {
  margin: 0;
}

.aviso,
.erro {
  padding: 0.8rem 1rem;
  font-weight: 600;
  background: var(--cor-superficie);
  border-radius: var(--raio);
}

.aviso {
  color: var(--cor-acerto);
  border-left: 5px solid var(--cor-acerto);
}

.erro {
  color: var(--cor-erro);
  border-left: 5px solid var(--cor-erro);
}

.lista {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.9rem 1rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
}

.item__info {
  display: grid;
  gap: 0.1rem;
  flex: 1 1 220px;
  min-width: 0;
}

.item__info span {
  font-size: 0.9rem;
  opacity: 0.75;
}

.item__fixo {
  font-size: 0.85rem;
  opacity: 0.7;
}

.item__pergunta {
  font-size: 0.9rem;
  font-weight: 600;
}

.botao-item {
  min-height: 44px;
  padding: 0 1rem;
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  background: transparent;
  border: 2px solid var(--cor-primaria);
  border-radius: 10px;
  cursor: pointer;
}

.botao-item--perigo {
  color: var(--cor-texto-claro);
  background: var(--cor-erro);
  border-color: var(--cor-erro);
}

.botao-item:disabled {
  opacity: 0.6;
  cursor: wait;
}

.nota {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  opacity: 0.7;
}
</style>
