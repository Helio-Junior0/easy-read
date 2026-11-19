<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ConteudoMarkdown from '../components/ConteudoMarkdown.vue'
import type { Livro } from '../types'
import { buscarLivroPorId } from '../services/dbService'
import { buscarCapituloDaPagina, buscarPagina, registrarLeitura } from '../services/leituraService'
import { contarPalavras } from '../services/paginacao'

const props = defineProps<{ id: string; n: string }>()
const router = useRouter()

const livroId = computed(() => Number(props.id))
const numero = computed(() => Number(props.n))

const carregando = ref(true)
const livro = ref<Livro>()
const md = ref('')
const capitulo = ref('')
const irPara = ref<number | null>(null)

// ---------- Preferências de leitura (guardadas no aparelho) ----------

type Tema = 'claro' | 'rose' | 'escuro'
const TEMAS: { id: Tema; nome: string }[] = [
  { id: 'claro', nome: 'Tema claro' },
  { id: 'rose', nome: 'Tema rosé' },
  { id: 'escuro', nome: 'Tema escuro' },
]

const TAMANHO_MINIMO = 16
const TAMANHO_MAXIMO = 28
const CHAVE_TAMANHO = 'easyread.tamanhoLetraPx'
const CHAVE_TEMA = 'easyread.temaLeitura'

const tamanho = ref(20)
const tema = ref<Tema>('claro')

try {
  const px = Number(localStorage.getItem(CHAVE_TAMANHO))
  if (Number.isInteger(px) && px >= TAMANHO_MINIMO && px <= TAMANHO_MAXIMO) tamanho.value = px
  const salvo = localStorage.getItem(CHAVE_TEMA)
  if (TEMAS.some((t) => t.id === salvo)) tema.value = salvo as Tema
} catch {
  // sem armazenamento: usa o padrão
}

function guardar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // ignora
  }
}

function mudarLetra(passo: number) {
  tamanho.value = Math.min(TAMANHO_MAXIMO, Math.max(TAMANHO_MINIMO, tamanho.value + passo))
  guardar(CHAVE_TAMANHO, String(tamanho.value))
}

function mudarTema(novo: Tema) {
  tema.value = novo
  guardar(CHAVE_TEMA, novo)
}

// ---------- Página ----------

const total = computed(() => livro.value?.totalPaginas ?? 0)
const ehPrimeira = computed(() => numero.value <= 1)
const ehUltima = computed(() => numero.value >= total.value)
const percentual = computed(() => (total.value ? Math.round((numero.value / total.value) * 100) : 0))
const minutos = computed(() => Math.max(1, Math.round(contarPalavras(md.value) / 200)))

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
    capitulo.value = (await buscarCapituloDaPagina(livroId.value, numero.value)) ?? ''
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
  <section class="leitor" :class="`leitor--${tema}`">
    <p v-if="carregando" class="leitor__aviso">Carregando página…</p>

    <div v-else-if="!livro" class="leitor__aviso">
      <h1>Livro não encontrado</h1>
      <p>Este livro não está baixado neste aparelho.</p>
      <RouterLink to="/" class="botao-principal">Ver a biblioteca</RouterLink>
    </div>

    <template v-else>
      <!-- Barra de leitura: fica presa no topo -->
      <div class="barra">
        <div class="barra__dentro">
          <RouterLink :to="`/livro/${livro.id}`" class="barra__livro">
            <span class="barra__titulo">{{ livro.titulo }}</span>
            <span class="barra__capitulo">
              <template v-if="capitulo">{{ capitulo }} · </template>Página {{ numero }} de {{ total }}
            </span>
          </RouterLink>

          <div class="controles">
            <div class="controles__letra" role="group" aria-label="Tamanho da letra">
              <button type="button" :disabled="tamanho <= TAMANHO_MINIMO" aria-label="Diminuir a letra" @click="mudarLetra(-2)">A−</button>
              <span class="controles__px" aria-live="polite">{{ tamanho }}px</span>
              <button type="button" :disabled="tamanho >= TAMANHO_MAXIMO" aria-label="Aumentar a letra" @click="mudarLetra(2)">A+</button>
            </div>

            <div class="controles__temas" role="group" aria-label="Tema da leitura">
              <button
                v-for="t in TEMAS"
                :key="t.id"
                type="button"
                class="tema"
                :class="[`tema--${t.id}`, { 'tema--ativo': tema === t.id }]"
                :aria-label="t.nome"
                :aria-pressed="tema === t.id"
                @click="mudarTema(t.id)"
              />
            </div>
          </div>
        </div>
        <div class="barra__progresso" role="progressbar" :aria-valuenow="percentual" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso no livro">
          <div class="barra__preenchimento" :style="{ width: percentual + '%' }" />
        </div>
      </div>

      <article class="pagina" :style="{ '--tamanho-letra': tamanho + 'px' }">
        <header class="pagina__cabecalho">
          <p class="pagina__numero">Página {{ numero }} de {{ total }}</p>
          <p class="pagina__tempo">Tempo de leitura: {{ minutos }} min</p>
        </header>

        <ConteudoMarkdown :md="md" />

        <nav class="navegacao" aria-label="Navegação entre páginas">
          <button type="button" class="botao-navegar" :disabled="ehPrimeira" @click="anterior">
            <span aria-hidden="true">‹</span> Anterior
          </button>
          <button type="button" class="botao-navegar botao-navegar--principal" @click="proxima">
            {{ ehUltima ? 'Concluir leitura' : 'Próxima' }} <span v-if="!ehUltima" aria-hidden="true">›</span>
          </button>
        </nav>
      </article>

      <div class="extras">
        <button type="button" class="botao-revisar" @click="revisar">Revisar o que li (resumo e quiz)</button>

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
/* Temas de leitura */
.leitor {
  --leitura-fundo: var(--cor-fundo);
  --leitura-papel: var(--cor-superficie);
  --leitura-tinta: #1d1513;
  --leitura-suave: #8a7a75;
  --leitura-destaque: var(--cor-primaria);
  --leitura-borda: var(--cor-borda);
  --leitura-citacao: #f3e7e4;
  --leitura-controle: #f4ece8;

  min-height: 100svh;
  padding: 0 1rem 3rem;
  color: var(--leitura-tinta);
  background: var(--leitura-fundo);
}

.leitor--rose {
  --leitura-fundo: #efdcda;
  --leitura-papel: #f8ecea;
  --leitura-tinta: #2b171a;
  --leitura-suave: #8b6a6c;
  --leitura-borda: #e3c4c6;
  --leitura-citacao: #f0d9d8;
  --leitura-controle: #f1dedc;
}

.leitor--escuro {
  --leitura-fundo: #100b0b;
  --leitura-papel: #1a1414;
  --leitura-tinta: #eadfd8;
  --leitura-suave: #a39590;
  --leitura-destaque: #e59aaa;
  --leitura-borda: #3a2a2c;
  --leitura-citacao: #261a1c;
  --leitura-controle: #261d1d;
}

.leitor__aviso {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  max-width: 860px;
  margin: 0 auto;
  padding-top: 2rem;
}

/* Barra de leitura */
.barra {
  position: sticky;
  top: 0;
  z-index: 10;
  max-width: 1160px;
  margin: 0 auto;
  transform: translateY(0.9rem);
  background: var(--leitura-papel);
  border: 1px solid var(--leitura-borda);
  border-radius: 18px;
  box-shadow: var(--sombra);
  overflow: hidden;
}

.barra__dentro {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem 1.5rem;
  padding: 0.85rem 1.25rem;
}

.barra__livro {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.barra__titulo {
  font-family: var(--fonte-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barra__capitulo {
  font-size: 0.85rem;
  color: var(--leitura-destaque);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.controles {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex-shrink: 0;
  padding: 0.3rem 0.75rem;
  background: var(--leitura-controle);
  border: 1px solid var(--leitura-borda);
  border-radius: 14px;
}

.controles__letra {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.controles__letra button {
  min-width: 40px;
  min-height: 40px;
  font: inherit;
  font-weight: 700;
  color: var(--leitura-tinta);
  background: none;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

.controles__letra button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--leitura-tinta) 10%, transparent);
}

.controles__letra button:disabled {
  opacity: 0.35;
  cursor: default;
}

.controles__px {
  min-width: 3rem;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
  color: var(--leitura-destaque);
  font-variant-numeric: tabular-nums;
}

.controles__temas {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-left: 0.9rem;
  border-left: 1px solid var(--leitura-borda);
}

.tema {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  /* área de toque maior que o círculo */
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18);
  position: relative;
}

.tema::after {
  content: '';
  position: absolute;
  inset: -9px;
}

.tema--claro {
  background: #fbf8f4;
}

.tema--rose {
  background: #e9cfcd;
}

.tema--escuro {
  background: #0c0808;
}

.tema--ativo {
  box-shadow: 0 0 0 2px var(--leitura-papel), 0 0 0 4px var(--leitura-destaque);
}

.barra__progresso {
  height: 3px;
  background: var(--leitura-borda);
}

.barra__preenchimento {
  height: 100%;
  background: var(--leitura-destaque);
  transition: width 0.3s;
}

/* Folha */
.pagina {
  max-width: 960px;
  margin: 2.4rem auto 0;
  padding: 3rem 4.5rem 2.5rem;
  background: var(--leitura-papel);
  border: 1px solid var(--leitura-borda);
  border-radius: 24px;
}

.pagina :deep(.markdown) {
  font-size: var(--tamanho-letra);
}

.pagina__cabecalho {
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  text-align: center;
  border-bottom: 1px solid var(--leitura-borda);
}

.pagina__numero {
  margin: 0 0 0.35rem;
  font-family: var(--fonte-titulo);
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: lining-nums;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--leitura-destaque);
}

.pagina__tempo {
  margin: 0;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--leitura-suave);
}

.navegacao {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--leitura-borda);
}

.botao-navegar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0 1.5rem;
  font: inherit;
  font-weight: 700;
  color: var(--leitura-destaque);
  background: transparent;
  border: 1px solid var(--leitura-destaque);
  border-radius: 999px;
  cursor: pointer;
}

.botao-navegar span {
  font-size: 1.4rem;
  line-height: 1;
}

.botao-navegar--principal {
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
  border-color: var(--cor-primaria);
}

.botao-navegar--principal:hover {
  background: var(--cor-primaria-escura);
}

.botao-navegar:disabled {
  opacity: 0.35;
  cursor: default;
}

.extras {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem 1.5rem;
  max-width: 960px;
  margin: 1.25rem auto 0;
}

.botao-revisar {
  min-height: 46px;
  padding: 0 1.25rem;
  font: inherit;
  font-weight: 700;
  color: var(--leitura-destaque);
  background: var(--leitura-papel);
  border: 1px solid var(--leitura-borda);
  border-radius: 999px;
  cursor: pointer;
}

.botao-revisar:hover {
  border-color: var(--leitura-destaque);
}

.pular {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--leitura-suave);
}

.pular input {
  width: 4.5rem;
  min-height: 44px;
  padding: 0 0.5rem;
  font: inherit;
  text-align: center;
  color: var(--leitura-tinta);
  background: var(--leitura-papel);
  border: 1px solid var(--leitura-borda);
  border-radius: 12px;
}

.pular button {
  min-width: 44px;
  min-height: 44px;
  font: inherit;
  font-weight: 700;
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}

@media (max-width: 800px) {
  .leitor {
    padding: 0 0.6rem 2.5rem;
  }

  .barra {
    border-radius: 14px;
  }

  .barra__dentro {
    flex-wrap: wrap;
    padding: 0.6rem 0.8rem;
  }

  .barra__livro {
    flex: 1 1 100%;
  }

  .controles {
    flex: 1 1 100%;
    justify-content: space-between;
    padding: 0.15rem 0.6rem;
  }

  .pagina {
    margin-top: 1.9rem;
    padding: 1.75rem 1.25rem 1.5rem;
    border-radius: 18px;
  }

  .botao-navegar {
    flex: 1;
    padding: 0 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .barra__preenchimento {
    transition: none;
  }
}
</style>
