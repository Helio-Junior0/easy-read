<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'
import type { Livro, Revisao, Tentativa } from '../types'
import { buscarLivroPorId, buscarTentativasPorLivro } from '../services/dbService'
import { buscarProgresso, sugerirIntervalo, type Progresso } from '../services/leituraService'
import { excluirLivroBaixado } from '../services/livroService'
import { buscarRevisoesPorLivro } from '../services/revisaoService'

const props = defineProps<{ id: string }>()
const router = useRouter()

const livroId = computed(() => Number(props.id))

const carregando = ref(true)
const livro = ref<Livro>()
const progresso = ref<Progresso>()
const revisoes = ref<Revisao[]>([])
const tentativas = ref<Tentativa[]>([])
const temPaginasParaRevisar = ref(false)
const confirmandoRemocao = ref(false)

async function carregar() {
  carregando.value = true
  livro.value = Number.isInteger(livroId.value) ? await buscarLivroPorId(livroId.value) : undefined
  if (livro.value) {
    progresso.value = await buscarProgresso(livroId.value)
    revisoes.value = await buscarRevisoesPorLivro(livroId.value)
    tentativas.value = await buscarTentativasPorLivro(livroId.value)
    temPaginasParaRevisar.value = (await sugerirIntervalo(livroId.value)) !== null
  }
  carregando.value = false
}

onMounted(carregar)
watch(livroId, carregar)

const comecou = computed(() => (progresso.value?.ultimaPaginaLida ?? 0) > 0)
const terminou = computed(
  () => !!progresso.value && progresso.value.ultimaPaginaLida >= progresso.value.totalPaginas,
)

// Última nota de cada revisão
function ultimaNota(revisaoId?: number): string {
  const doQuiz = tentativas.value.filter((t) => t.revisaoId === revisaoId)
  const ultima = doQuiz[doQuiz.length - 1]
  return ultima ? `${ultima.acertos}/${ultima.total} acertos` : 'Quiz ainda não feito'
}

function dataCurta(data: Date): string {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

async function remover() {
  await excluirLivroBaixado(livroId.value)
  router.push('/')
}
</script>

<template>
  <section class="livro">
    <BotaoVoltar fallback="/" />

    <p v-if="carregando">Carregando livro…</p>

    <div v-else-if="!livro" class="aviso">
      <h1 class="titulo">Livro não encontrado</h1>
      <p>Este livro não está baixado neste aparelho.</p>
      <RouterLink to="/" class="botao-principal">Ver a biblioteca</RouterLink>
    </div>

    <template v-else-if="progresso">
      <div class="capa-bloco">
        <div class="capa" aria-hidden="true">
          <span class="capa__titulo">{{ livro.titulo }}</span>
          <span class="capa__texto">{{ livro.autor }}</span>
        </div>

        <div class="info">
          <p v-if="livro.categoria" class="rotulo">{{ livro.categoria }}</p>
          <h1 class="titulo">{{ livro.titulo }}</h1>
          <p class="autor">{{ livro.autor }}</p>
          <p v-if="livro.descricao" class="descricao">{{ livro.descricao }}</p>

          <div class="stats">
            <div class="stat">
              <span class="stat__valor">{{ progresso.totalPaginas }}</span>
              <span class="stat__rotulo">páginas</span>
            </div>
            <div class="stat">
              <span class="stat__valor">{{ progresso.paginasLidas }}</span>
              <span class="stat__rotulo">lidas</span>
            </div>
            <div class="stat">
              <span class="stat__valor">{{ revisoes.length }}</span>
              <span class="stat__rotulo">revisões</span>
            </div>
          </div>

          <div class="progresso">
            <div class="progresso__info">
              <span>Progresso</span>
              <span>{{ progresso.percentual }}%</span>
            </div>
            <div
              class="progresso__barra"
              role="progressbar"
              :aria-valuenow="progresso.percentual"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="progresso__preenchimento" :style="{ width: progresso.percentual + '%' }" />
            </div>
          </div>

          <div class="acoes">
            <RouterLink
              :to="`/livro/${livro.id}/pagina/${terminou ? 1 : progresso.paginaParaContinuar}`"
              class="botao-principal"
            >
              {{ terminou ? 'Ler de novo' : comecou ? `Continuar na página ${progresso.paginaParaContinuar}` : 'Começar a ler' }}
            </RouterLink>
            <RouterLink
              v-if="comecou"
              :to="`/livro/${livro.id}/revisao`"
              class="botao-secundario"
            >
              {{ temPaginasParaRevisar ? 'Revisar o que li' : 'Nova revisão' }}
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="secao-cabecalho">
        <h2 class="secao-titulo">Revisões</h2>
        <span class="secao-contagem">{{ revisoes.length }} {{ revisoes.length === 1 ? 'feita' : 'feitas' }}</span>
      </div>

      <p v-if="revisoes.length === 0" class="vazio">
        Depois de ler algumas páginas, toque em "Revisar o que li" para receber um resumo e um quiz desse trecho.
      </p>

      <ul v-else class="grade">
        <li v-for="revisao in revisoes" :key="revisao.id">
          <RouterLink
            :to="{ path: `/livro/${livro.id}/revisao`, query: { de: revisao.inicio, ate: revisao.fim } }"
            class="card"
          >
            <div class="card__topo">
              <span class="card__numero">Páginas {{ revisao.inicio }} a {{ revisao.fim }}</span>
              <span class="selo">{{ dataCurta(revisao.criadaEm) }}</span>
            </div>
            <p class="card__meta">{{ revisao.perguntas.length }} perguntas · {{ ultimaNota(revisao.id) }}</p>
            <div class="card__rodape">
              <span class="card__acao">Abrir resumo e quiz</span>
              <span class="card__seta" aria-hidden="true">→</span>
            </div>
          </RouterLink>
        </li>
      </ul>

      <footer class="rodape">
        <p v-if="livro.licenca" class="licenca">Licença: {{ livro.licenca }}</p>

        <button v-if="!confirmandoRemocao" type="button" class="botao-texto" @click="confirmandoRemocao = true">
          Remover do aparelho
        </button>
        <div v-else class="confirmacao" role="alert">
          <span>Isso apaga o livro, as páginas lidas e as revisões deste aparelho.</span>
          <button type="button" class="botao-texto botao-texto--perigo" @click="remover">Remover</button>
          <button type="button" class="botao-texto" @click="confirmandoRemocao = false">Cancelar</button>
        </div>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.livro {
  display: grid;
  gap: 1.75rem;
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

/* Bloco de capa + informações */
.capa-bloco {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.75rem;
  padding: 1.5rem;
  background: var(--cor-superficie);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--raio);
}

.capa {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.25rem;
  min-height: 240px;
  padding: 1rem;
  background: var(--cor-primaria);
  color: var(--cor-texto-claro);
  border-radius: 10px;
  box-shadow: inset 0 0 0 4px var(--cor-destaque);
}

.capa__numero {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
}

.capa__texto {
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.85;
}

.info {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  min-width: 0;
}

.rotulo {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cor-primaria);
}

.titulo {
  margin: 0;
  font-size: 1.9rem;
  line-height: 1.2;
}

.autor {
  margin: 0;
  font-size: 1rem;
  opacity: 0.7;
}

/* Estatísticas */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.stat {
  display: grid;
  gap: 0.1rem;
  padding: 0.75rem;
  background: var(--cor-fundo, rgba(0, 0, 0, 0.03));
  border-radius: 10px;
  text-align: center;
}

.stat__valor {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--cor-primaria);
}

.stat__rotulo {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Barra de progresso */
.progresso {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.progresso__info {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 700;
}

.progresso__barra {
  height: 10px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.progresso__preenchimento {
  height: 100%;
  background: var(--cor-destaque);
  border-radius: 999px;
  transition: width 0.6s ease-out;
}

/* Cabeçalho da seção */
.secao-cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 2px solid var(--cor-primaria);
  padding-bottom: 0.5rem;
}

.secao-titulo {
  margin: 0;
  font-size: 1.3rem;
}

.secao-contagem {
  font-size: 0.9rem;
  opacity: 0.7;
}

/* Dentro do grid, o botão de voltar e o rótulo não devem esticar */
.botao-voltar,
.rotulo {
  justify-self: start;
}

/* Revisões já feitas */
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: 0.5rem;
  height: 100%;
  padding: 1rem 1.1rem;
  background: var(--cor-superficie);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-top: 4px solid var(--cor-destaque);
  border-radius: var(--raio);
  color: inherit;
  text-decoration: none;
}

.card:hover {
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}

.card__topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.card__numero {
  font-weight: 700;
}

.selo {
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.07);
  border-radius: 999px;
}

.card__meta {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.75;
}

.card__rodape {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.12);
}

.card__acao,
.card__seta {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--cor-primaria);
}

.capa__titulo {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
}

.capa__texto {
  text-align: center;
}

.descricao {
  margin: 0.25rem 0 0;
  line-height: 1.55;
  opacity: 0.85;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.botao-secundario {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 1.25rem;
  font-weight: 700;
  color: var(--cor-primaria);
  text-decoration: none;
  border: 2px solid var(--cor-primaria);
  border-radius: var(--raio);
}

.botao-secundario:hover {
  background: var(--cor-fundo);
}

.vazio {
  margin: 0;
  opacity: 0.8;
}

.aviso {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}

.rodape {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
}

.licenca {
  margin: 0;
  opacity: 0.7;
}

.botao-texto {
  min-height: 44px;
  padding: 0 0.25rem;
  font: inherit;
  font-weight: 600;
  color: var(--cor-primaria);
  text-decoration: underline;
  background: none;
  border: 0;
  cursor: pointer;
}

.botao-texto--perigo {
  color: var(--cor-erro);
}

.confirmacao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1rem;
}

@media (max-width: 700px) {
  .capa-bloco {
    grid-template-columns: 1fr;
    padding: 1.1rem;
  }

  .capa {
    min-height: 140px;
  }

  .titulo {
    font-size: 1.5rem;
  }

  .acoes > * {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progresso__preenchimento {
    transition: none;
  }
}
</style>
