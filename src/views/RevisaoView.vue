<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'
import ConteudoMarkdown from '../components/ConteudoMarkdown.vue'
import PerguntaQuiz from '../components/PerguntaQuiz.vue'
import { useQuiz } from '../composables/useQuiz'
import type { Livro, Quiz, Revisao } from '../types'
import { buscarLivroPorId, buscarRevisao } from '../services/dbService'
import { buscarProgresso, sugerirIntervalo } from '../services/leituraService'
import { ErroRevisao, obterRevisao, registrarResultado } from '../services/revisaoService'
import { MAX_PAGINAS_POR_REVISAO } from '../shared/revisaoFormato'

type Etapa = 'intervalo' | 'gerando' | 'resumo' | 'quiz' | 'resultado'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()

const livroId = computed(() => Number(props.id))

const carregando = ref(true)
const livro = ref<Livro>()
const ultimaLida = ref(0)
const inicio = ref(1)
const fim = ref(1)
const etapa = ref<Etapa>('intervalo')
const erro = ref('')
const revisao = ref<Revisao>()
const jaSalva = ref(false)
const resultadoSalvo = ref(false)

const perguntas = computed<Quiz[]>(() => revisao.value?.perguntas ?? [])
const quiz = useQuiz(perguntas)

function numeroDaQuery(valor: unknown): number | null {
  const n = Number(Array.isArray(valor) ? valor[0] : valor)
  return Number.isInteger(n) && n >= 1 ? n : null
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  revisao.value = undefined
  etapa.value = 'intervalo'

  livro.value = Number.isInteger(livroId.value) ? await buscarLivroPorId(livroId.value) : undefined
  if (!livro.value) {
    carregando.value = false
    return
  }

  const progresso = await buscarProgresso(livroId.value)
  ultimaLida.value = progresso.ultimaPaginaLida

  const de = numeroDaQuery(route.query.de)
  const ate = numeroDaQuery(route.query.ate)

  if (de && ate) {
    // Veio do histórico: se a revisão já existe, abre direto
    inicio.value = de
    fim.value = ate
    const salva = await buscarRevisao(livroId.value, de, ate)
    if (salva) {
      revisao.value = salva
      etapa.value = 'resumo'
    }
  } else {
    const sugestao = await sugerirIntervalo(livroId.value)
    inicio.value = sugestao?.inicio ?? 1
    fim.value = sugestao?.fim ?? Math.max(ultimaLida.value, 1)
    // Respeita o limite de páginas por revisão
    if (fim.value - inicio.value + 1 > MAX_PAGINAS_POR_REVISAO) {
      inicio.value = fim.value - MAX_PAGINAS_POR_REVISAO + 1
    }
  }

  await conferirSalva()
  carregando.value = false
}

async function conferirSalva() {
  jaSalva.value =
    Number.isInteger(inicio.value) && Number.isInteger(fim.value)
      ? !!(await buscarRevisao(livroId.value, inicio.value, fim.value))
      : false
}

onMounted(carregar)
watch(livroId, carregar)
watch([inicio, fim], conferirSalva)

const quantidade = computed(() => fim.value - inicio.value + 1)

async function gerar(gerarNova = false) {
  erro.value = ''
  etapa.value = 'gerando'
  try {
    revisao.value = await obterRevisao(livroId.value, inicio.value, fim.value, { gerarNova })
    resultadoSalvo.value = false
    etapa.value = 'resumo'
  } catch (e) {
    erro.value = e instanceof ErroRevisao ? e.message : 'Algo deu errado ao gerar a revisão. Tente de novo.'
    if (!(e instanceof ErroRevisao)) console.error(e)
    etapa.value = revisao.value ? 'resumo' : 'intervalo'
  }
}

function comecarQuiz() {
  quiz.reiniciar()
  resultadoSalvo.value = false
  etapa.value = 'quiz'
}

async function avancar() {
  quiz.proxima()
  if (quiz.finalizado.value) {
    etapa.value = 'resultado'
    if (!resultadoSalvo.value && revisao.value?.id !== undefined) {
      resultadoSalvo.value = true
      await registrarResultado(revisao.value.id, quiz.acertos.value)
    }
  }
}

const mensagemResultado = computed(() => {
  const total = quiz.total.value
  const acertos = quiz.acertos.value
  if (acertos === total) return { titulo: 'Excelente!', texto: 'Você acertou todas as perguntas deste trecho.' }
  if (acertos >= total / 2) return { titulo: 'Muito bem!', texto: 'Você acertou a maioria. Vale reler as páginas das perguntas que errou.' }
  return { titulo: 'Não desanime!', texto: 'Releia o resumo e as páginas indicadas e tente de novo.' }
})

function novoIntervalo() {
  revisao.value = undefined
  erro.value = ''
  etapa.value = 'intervalo'
  router.replace(`/livro/${livroId.value}/revisao`)
}
</script>

<template>
  <section class="revisao">
    <BotaoVoltar :fallback="`/livro/${id}`" />

    <p v-if="carregando">Carregando…</p>

    <div v-else-if="!livro" class="bloco">
      <h1>Livro não encontrado</h1>
      <p>Este livro não está baixado neste aparelho.</p>
      <RouterLink to="/" class="botao-principal">Ver a biblioteca</RouterLink>
    </div>

    <template v-else>
      <p class="rotulo">Revisão · {{ livro.titulo }}</p>

      <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

      <!-- 1. Escolher as páginas -->
      <form v-if="etapa === 'intervalo'" class="bloco" @submit.prevent="gerar(false)">
        <h1>Quais páginas você quer revisar?</h1>
        <p v-if="ultimaLida > 0" class="apoio">
          Você leu até a página {{ ultimaLida }} de {{ livro.totalPaginas }}.
        </p>
        <p v-else class="apoio">
          Você ainda não marcou nenhuma página como lida. Leia um trecho e volte aqui, ou escolha as páginas abaixo.
        </p>

        <div class="intervalo">
          <label class="campo">
            <span>Da página</span>
            <input v-model.number="inicio" type="number" inputmode="numeric" min="1" :max="livro.totalPaginas" required />
          </label>
          <label class="campo">
            <span>Até a página</span>
            <input v-model.number="fim" type="number" inputmode="numeric" :min="inicio || 1" :max="livro.totalPaginas" required />
          </label>
        </div>

        <p v-if="quantidade > MAX_PAGINAS_POR_REVISAO" class="apoio apoio--alerta">
          Escolha no máximo {{ MAX_PAGINAS_POR_REVISAO }} páginas por revisão.
        </p>
        <p v-else-if="jaSalva" class="apoio">
          Você já tem uma revisão salva destas páginas. Ela abre na hora, mesmo sem internet.
        </p>
        <p v-else class="apoio">
          O resumo e o quiz são gerados por IA a partir destas páginas. Precisa de internet só na primeira vez.
        </p>

        <button type="submit" class="botao-principal" :disabled="quantidade < 1 || quantidade > MAX_PAGINAS_POR_REVISAO">
          {{ jaSalva ? 'Abrir revisão' : 'Gerar resumo e quiz' }}
        </button>
      </form>

      <!-- 2. Esperando a IA -->
      <div v-else-if="etapa === 'gerando'" class="bloco bloco--centro" role="status">
        <div class="girando" aria-hidden="true" />
        <h1>Gerando sua revisão…</h1>
        <p class="apoio">A IA está lendo as páginas {{ inicio }} a {{ fim }}. Isso pode levar alguns segundos.</p>
      </div>

      <!-- 3. Resumo -->
      <div v-else-if="etapa === 'resumo' && revisao" class="bloco">
        <h1>Resumo das páginas {{ revisao.inicio }} a {{ revisao.fim }}</h1>
        <ConteudoMarkdown :md="revisao.resumo" />

        <div class="acoes">
          <button type="button" class="botao-principal" @click="comecarQuiz">
            Fazer o quiz ({{ revisao.perguntas.length }} perguntas)
          </button>
          <button type="button" class="botao-secundario" @click="novoIntervalo">Escolher outras páginas</button>
        </div>
      </div>

      <!-- 4. Quiz -->
      <div v-else-if="etapa === 'quiz' && quiz.perguntaAtual.value" class="bloco">
        <div class="quiz-topo">
          <span>Pergunta {{ quiz.indice.value + 1 }} de {{ quiz.total.value }}</span>
          <span>{{ quiz.acertos.value }} {{ quiz.acertos.value === 1 ? 'acerto' : 'acertos' }}</span>
        </div>

        <PerguntaQuiz
          :key="quiz.indice.value"
          :enunciado="quiz.perguntaAtual.value.pergunta"
          :opcoes="quiz.perguntaAtual.value.opcoes"
          :selecionada="quiz.selecionada.value"
          :confirmada="quiz.confirmada.value"
          :correta="quiz.indiceCorreto.value"
          @selecionar="quiz.selecionar"
        />

        <p v-if="quiz.confirmada.value" class="retorno" :class="quiz.acertou.value ? 'retorno--certo' : 'retorno--errado'" role="status">
          <template v-if="quiz.acertou.value">Resposta certa!</template>
          <template v-else>
            Resposta errada.
            <RouterLink :to="`/livro/${livro.id}/pagina/${quiz.perguntaAtual.value.pagina}`">
              Reveja a página {{ quiz.perguntaAtual.value.pagina }}
            </RouterLink>
          </template>
        </p>

        <button v-if="!quiz.confirmada.value" type="button" class="botao-principal" :disabled="!quiz.podeConfirmar.value" @click="quiz.confirmar">
          Confirmar resposta
        </button>
        <button v-else type="button" class="botao-principal" @click="avancar">
          {{ quiz.ehUltima.value ? 'Ver resultado' : 'Próxima pergunta' }}
        </button>
      </div>

      <!-- 5. Resultado -->
      <div v-else-if="etapa === 'resultado' && revisao" class="bloco bloco--centro">
        <p class="placar">{{ quiz.acertos.value }}<span>/{{ quiz.total.value }}</span></p>
        <h1>{{ mensagemResultado.titulo }}</h1>
        <p class="apoio">{{ mensagemResultado.texto }}</p>

        <div class="acoes acoes--centro">
          <RouterLink :to="`/livro/${livro.id}`" class="botao-principal">Voltar ao livro</RouterLink>
          <button type="button" class="botao-secundario" @click="comecarQuiz">Refazer o quiz</button>
          <button type="button" class="botao-secundario" @click="gerar(true)">Gerar novas perguntas</button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.revisao {
  max-width: 760px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.bloco {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
}

.bloco h1 {
  margin: 0;
  font-size: 1.5rem;
}

.bloco--centro {
  justify-items: center;
  text-align: center;
  padding: 2.5rem 1.5rem;
}

.apoio {
  margin: 0;
  line-height: 1.55;
  opacity: 0.85;
}

.apoio--alerta {
  font-weight: 700;
  color: var(--cor-erro);
  opacity: 1;
}

.erro {
  padding: 0.8rem 1rem;
  font-weight: 600;
  color: var(--cor-erro);
  background: var(--cor-superficie);
  border-left: 5px solid var(--cor-erro);
  border-radius: var(--raio);
}

.intervalo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.campo {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
}

.campo input {
  width: 100%;
  min-height: 52px;
  padding: 0 0.9rem;
  font: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--cor-fundo);
  border: 2px solid transparent;
  border-radius: 10px;
}

.campo input:focus {
  border-color: var(--cor-primaria);
  outline: none;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.acoes--centro {
  justify-content: center;
}

.botao-secundario {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 1.25rem;
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  text-decoration: none;
  background: transparent;
  border: 2px solid var(--cor-primaria);
  border-radius: var(--raio);
  cursor: pointer;
}

.quiz-topo {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.retorno {
  margin: 0;
  padding: 0.75rem 1rem;
  font-weight: 700;
  border-radius: var(--raio);
}

.retorno--certo {
  color: var(--cor-acerto);
  background: color-mix(in srgb, var(--cor-acerto) 14%, var(--cor-fundo));
}

.retorno--errado {
  color: var(--cor-erro);
  background: color-mix(in srgb, var(--cor-erro) 10%, var(--cor-fundo));
}

.placar {
  margin: 0;
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--cor-primaria);
  font-variant-numeric: tabular-nums;
}

.placar span {
  font-size: 2rem;
  opacity: 0.6;
}

.girando {
  width: 44px;
  height: 44px;
  border: 5px solid color-mix(in srgb, var(--cor-primaria) 25%, transparent);
  border-top-color: var(--cor-primaria);
  border-radius: 50%;
  animation: girar 0.9s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .bloco {
    padding: 1.1rem;
  }

  .acoes > * {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .girando {
    animation-duration: 3s;
  }
}
</style>
