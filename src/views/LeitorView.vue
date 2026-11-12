<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ConteudoMarkdown from '../components/ConteudoMarkdown.vue'
import type { Livro } from '../types'
import { buscarLivroPorId } from '../services/dbService'
import { buscarPagina, registrarLeitura } from '../services/leituraService'

const props = defineProps<{ id: string; n: string }>()
const router = useRouter()

const livroId = computed(() => Number(props.id))
const numero = computed(() => Number(props.n))

const carregando = ref(true)
const livro = ref<Livro>()
const md = ref('')
const irPara = ref<number | null>(null)

// Tamanho da letra, guardado no aparelho
const TAMANHOS = [0.95, 1.08, 1.22, 1.38]
const CHAVE_TAMANHO = 'easyread.tamanhoLetra'
const nivel = ref(1)
try {
  const salvo = Number(localStorage.getItem(CHAVE_TAMANHO))
  if (Number.isInteger(salvo) && salvo >= 0 && salvo < TAMANHOS.length) nivel.value = salvo
} catch {
  // sem armazenamento: usa o tamanho padrão
}

function mudarLetra(passo: number) {
  nivel.value = Math.min(TAMANHOS.length - 1, Math.max(0, nivel.value + passo))
  try {
    localStorage.setItem(CHAVE_TAMANHO, String(nivel.value))
  } catch {
    // ignora
  }
}

const total = computed(() => livro.value?.totalPaginas ?? 0)
const ehPrimeira = computed(() => numero.value <= 1)
const ehUltima = computed(() => numero.value >= total.value)
const percentual = computed(() => (total.value ? Math.round((numero.value / total.value) * 100) : 0))

async function carregar() {
  carregando.value = true
  md.value = ''
  livro.value = Number.isInteger(livroId.value) ? await buscarLivroPorId(livroId.value) : undefined

  if (livro.value) {
    // Número de página fora do livro: vai para a mais próxima que existe
    if (!Number.isInteger(numero.value) || numero.value < 1) {
      await router.replace(`/livro/${livroId.value}/pagina/1`)
      return
    }
    if (numero.value > livro.value.totalPaginas) {
      await router.replace(`/livro/${livroId.value}/pagina/${livro.value.totalPaginas}`)
      return
    }
    md.value = (await buscarPagina(livroId.value, numero.value))?.md ?? ''
  }
  carregando.value = false
}

onMounted(carregar)
watch([livroId, numero], carregar)

function anterior() {
  if (!ehPrimeira.value) router.push(`/livro/${livroId.value}/pagina/${numero.value - 1}`)
}

// Avançar marca a página atual como lida
async function proxima() {
  await registrarLeitura(livroId.value, numero.value)
  if (ehUltima.value) router.push(`/livro/${livroId.value}`)
  else router.push(`/livro/${livroId.value}/pagina/${numero.value + 1}`)
}

async function revisar() {
  await registrarLeitura(livroId.value, numero.value)
  router.push(`/livro/${livroId.value}/revisao`)
}

function pular() {
  const destino = Number(irPara.value)
  if (Number.isInteger(destino) && destino >= 1 && destino <= total.value) {
    router.push(`/livro/${livroId.value}/pagina/${destino}`)
    irPara.value = null
  }
}

function aoTeclar(e: KeyboardEvent) {
  const alvo = e.target as HTMLElement | null
  if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return
  if (e.key === 'ArrowRight') proxima()
  if (e.key === 'ArrowLeft') anterior()
}

onMounted(() => window.addEventListener('keydown', aoTeclar))
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>

<template>
  <section class="leitor">
    <p v-if="carregando" class="leitor__aviso">Carregando página…</p>

    <div v-else-if="!livro" class="leitor__aviso">
      <h1>Livro não encontrado</h1>
      <p>Este livro não está baixado neste aparelho.</p>
      <RouterLink to="/" class="botao-principal">Ver a biblioteca</RouterLink>
    </div>

    <template v-else>
      <header class="topo">
        <RouterLink :to="`/livro/${livro.id}`" class="topo__voltar">
          <span aria-hidden="true">←</span> {{ livro.titulo }}
        </RouterLink>

        <div class="topo__letra" role="group" aria-label="Tamanho da letra">
          <button type="button" :disabled="nivel === 0" aria-label="Diminuir a letra" @click="mudarLetra(-1)">A−</button>
          <button type="button" :disabled="nivel === TAMANHOS.length - 1" aria-label="Aumentar a letra" @click="mudarLetra(1)">A+</button>
        </div>
      </header>

      <div class="marcador">
        <span>Página {{ numero }} de {{ total }}</span>
        <span>{{ percentual }}%</span>
      </div>
      <div class="marcador__barra" aria-hidden="true">
        <div class="marcador__preenchimento" :style="{ width: percentual + '%' }" />
      </div>

      <article class="pagina" :style="{ '--tamanho-letra': TAMANHOS[nivel] + 'rem' }">
        <ConteudoMarkdown :md="md" />
      </article>

      <nav class="navegacao" aria-label="Navegação entre páginas">
        <button type="button" class="botao-navegar" :disabled="ehPrimeira" @click="anterior">
          <span aria-hidden="true">←</span> Anterior
        </button>
        <button type="button" class="botao-principal" @click="proxima">
          {{ ehUltima ? 'Concluir leitura' : 'Próxima' }} <span v-if="!ehUltima" aria-hidden="true">&nbsp;→</span>
        </button>
      </nav>

      <div class="extras">
        <button type="button" class="botao-revisar" @click="revisar">Revisar o que li</button>

        <form class="pular" @submit.prevent="pular">
          <label for="ir-para">Ir para a página</label>
          <input id="ir-para" v-model.number="irPara" type="number" inputmode="numeric" min="1" :max="total" />
          <button type="submit">Ir</button>
        </form>
      </div>
    </template>
  </section>
</template>

<style scoped>
.leitor {
  max-width: 760px;
  margin: 0 auto;
  padding: 1rem 1.1rem 3rem;
}

.leitor__aviso {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding-top: 1rem;
}

.topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.topo__voltar {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  min-width: 0;
  font-weight: 700;
  text-decoration: none;
}

.topo__letra {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.topo__letra button {
  min-width: 44px;
  min-height: 44px;
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  background: var(--cor-superficie);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

.topo__letra button:disabled {
  opacity: 0.45;
  cursor: default;
}

.marcador {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.marcador__barra {
  height: 6px;
  margin: 0.35rem 0 1.25rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.marcador__preenchimento {
  height: 100%;
  background: var(--cor-destaque);
}

.pagina {
  min-height: 50vh;
  padding: 1.5rem 1.4rem;
  background: #fffaf2;
  border-radius: var(--raio);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.pagina :deep(.markdown) {
  font-size: var(--tamanho-letra);
}

.navegacao {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.navegacao .botao-principal {
  width: 100%;
}

.botao-navegar {
  min-height: 48px;
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  background: transparent;
  border: 2px solid var(--cor-primaria);
  border-radius: var(--raio);
  cursor: pointer;
}

.botao-navegar:disabled {
  opacity: 0.4;
  cursor: default;
}

.extras {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem 1.5rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.botao-revisar {
  min-height: 44px;
  padding: 0 1rem;
  font: inherit;
  font-weight: 700;
  color: var(--cor-texto);
  background: var(--cor-destaque);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.pular {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.pular input {
  width: 4.5rem;
  min-height: 44px;
  padding: 0 0.5rem;
  font: inherit;
  text-align: center;
  background: var(--cor-superficie);
  border: 2px solid transparent;
  border-radius: 10px;
}

.pular button {
  min-width: 44px;
  min-height: 44px;
  font: inherit;
  font-weight: 700;
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .leitor {
    padding: 0.75rem 0.75rem 2.5rem;
  }

  .pagina {
    padding: 1.1rem 1rem;
  }
}
</style>
