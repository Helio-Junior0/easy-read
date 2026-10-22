<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()

type Pergunta = {
  enunciado: string
  opcoes: string[]
  correta: number // índice da alternativa certa (0 = primeira opção)
}

// Banco de perguntas por capítulo. Chave = id do capítulo (o mesmo da URL).
const bancoDePerguntas: Record<string, Pergunta[]> = {
  '1': [
    {
      enunciado: 'Onde o narrador encontrou o rapaz que lhe deu o apelido?',
      opcoes: ['No trem da Central', 'Na praça', 'Na livraria', 'Na igreja'],
      correta: 0, // CONFIRME no livro
    },
    {
      // TODO: substituir pelo conteúdo real
      enunciado: '[PERGUNTA 2 DO CAPÍTULO 1]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 0,
    },
    {
      // TODO: substituir pelo conteúdo real
      enunciado: '[PERGUNTA 3 DO CAPÍTULO 1]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 0,
    },
    {
      // TODO: substituir pelo conteúdo real
      enunciado: '[PERGUNTA 4 DO CAPÍTULO 1]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 0,
    },
  ],
  '2': [
    {
      // TODO: substituir pelo conteúdo real
      enunciado: '[PERGUNTA 1 DO CAPÍTULO 2]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 1,
    },
    {
      // TODO: substituir pelo conteúdo real
      enunciado: '[PERGUNTA 2 DO CAPÍTULO 2]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 0,
    },
    {
      // TODO: substituir pelo conteúdo real
      enunciado: '[PERGUNTA 3 DO CAPÍTULO 2]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 2,
    },
    {
      
      enunciado: '[PERGUNTA 4 DO CAPÍTULO 2]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 3,
    },
  ],
  '3': [
    {
      
      enunciado: '[PERGUNTA 1 DO CAPÍTULO 3]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 0,
    },
    {
      
      enunciado: '[PERGUNTA 2 DO CAPÍTULO 3]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 1,
    },
    {
      
      enunciado: '[PERGUNTA 3 DO CAPÍTULO 3]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 2,
    },
    {
      
      enunciado: '[PERGUNTA 4 DO CAPÍTULO 3]',
      opcoes: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correta: 3,
    },
  ],
}

const perguntas = computed(() => bancoDePerguntas[props.id] ?? [])
const temPerguntas = computed(() => perguntas.value.length > 0)

const indiceAtual = ref(0)
const respostas = ref<(number | null)[]>([])
const finalizado = ref(false)

function reiniciar() {
  indiceAtual.value = 0
  respostas.value = perguntas.value.map(() => null)
  finalizado.value = false
}

reiniciar()

watch(() => props.id, reiniciar)

const perguntaAtual = computed(() => perguntas.value[indiceAtual.value])

const ultimaPergunta = computed(
  () => indiceAtual.value === perguntas.value.length - 1,
)

const respondidaAtual = computed(
  () => respostas.value[indiceAtual.value] !== null,
)

const acertos = computed(() =>
  perguntas.value.reduce(
    (total, p, i) => total + (respostas.value[i] === p.correta ? 1 : 0),
    0,
  ),
)

const erros = computed(() => perguntas.value.length - acertos.value)

const percentual = computed(() =>
  perguntas.value.length
    ? Math.round((acertos.value / perguntas.value.length) * 100)
    : 0,
)

const resultado = computed(() => {
  const total = perguntas.value.length

  if (acertos.value === total) {
    return {
      titulo: 'Excelente!',
      mensagem: 'Você acertou todas as perguntas! Continue assim e siga aprendendo.',
      emoji: '🌟',
    }
  }

  if (acertos.value >= total / 2) {
    return {
      titulo: 'Muito bem!',
      mensagem: 'Você acertou a maioria. Revise as perguntas que errou.',
      emoji: '👏',
    }
  }

  return {
    titulo: 'Não desanime!',
    mensagem:
      'Errar também faz parte do aprendizado. Revise o resumo e tente novamente!',
    emoji: '💪',
  }
})

function proxima() {
  if (!respondidaAtual.value) return

  if (ultimaPergunta.value) {
    finalizado.value = true
    return
  }

  indiceAtual.value++
}

function refazerQuiz() {
  reiniciar()
}

function voltarAoLivro() {
  
  if (window.history.state?.back) {
    router.back()
  } else {
    
    router.replace(`/livro/${Math.ceil(Number(props.id) / 3)}`)
  }
}
</script>

<template>
  <section>
    <BotaoVoltar :fallback="`/capitulo/${id}`" />

    <p class="rotulo">Quiz do capítulo #{{ id }}</p>

    <p v-if="!temPerguntas">
      Ainda não há quiz para este capítulo.
    </p>

    <template v-else-if="!finalizado">
      <p class="progresso">
        Pergunta {{ indiceAtual + 1 }} de {{ perguntas.length }}
      </p>

      <fieldset :key="indiceAtual" class="pergunta">
        <legend class="pergunta__enunciado">
          {{ perguntaAtual.enunciado }}
        </legend>

        <div class="alternativas">
          <label
            v-for="(opcao, oi) in perguntaAtual.opcoes"
            :key="oi"
            class="alternativa"
          >
            <input
              v-model="respostas[indiceAtual]"
              type="radio"
              :value="oi"
              name="resposta-quiz"
            />
            <span>{{ opcao }}</span>
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        class="botao-principal"
        :disabled="!respondidaAtual"
        @click="proxima"
      >
        {{ ultimaPergunta ? 'Finalizar quiz' : 'Próximo' }}
      </button>
    </template>

    <section v-else class="resultado">
      <div class="resultado__topo">
        <span class="resultado__emoji">{{ resultado.emoji }}</span>
        <h2 class="resultado__titulo">{{ resultado.titulo }}</h2>
        <p class="resultado__mensagem">{{ resultado.mensagem }}</p>
      </div>

      <div class="resultado__placar">
        <div class="placar__numero">
          {{ acertos }}<span>/{{ perguntas.length }}</span>
        </div>
        <p class="placar__rotulo">acertos</p>

        <div
          class="barra"
          role="progressbar"
          :aria-valuenow="percentual"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="barra__preenchimento" :style="{ width: percentual + '%' }" />
        </div>

        <p class="placar__detalhe">
          {{ percentual }}% de aproveitamento · {{ erros }} {{ erros === 1 ? 'erro' : 'erros' }}
        </p>
      </div>

      <div class="resultado__acoes">
        <button type="button" class="botao-principal" @click="refazerQuiz">
          Refazer quiz
        </button>

        <button
          type="button"
          class="botao-principal botao-secundario"
          @click="voltarAoLivro"
        >
          Voltar ao livro
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.progresso {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  opacity: 0.7;
}

.pergunta {
  margin: 0 0 1.5rem;
  padding: 0;
  border: 0;
}

.pergunta__enunciado {
  margin-bottom: 1rem;
  font-size: 1.15rem;
  font-weight: 700;
}

.alternativas {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
}

.alternativa {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.9rem;
  min-height: 60px;
  padding: 0.9rem 1.2rem;
  background: var(--cor-superficie);
  border: 2px solid transparent;
  border-radius: var(--raio);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.alternativa span {
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.01em;
}

.alternativa:hover {
  border-color: var(--cor-secundaria);
}

.alternativa:has(input:checked) {
  border-color: var(--cor-primaria);
  box-shadow: inset 6px 0 0 var(--cor-destaque);
}

.alternativa input {
  width: 1.2rem;
  height: 1.2rem;
  margin: 0;
  accent-color: var(--cor-primaria);
}

.resultado {
  display: grid;
  gap: 1.25rem;
  text-align: center;
}

.resultado__topo {
  display: grid;
  gap: 0.4rem;
  justify-items: center;
}

.resultado__emoji {
  font-size: 3.5rem;
  line-height: 1;
  animation: pop 0.5s ease-out;
}

.resultado__titulo {
  margin: 0;
  font-size: 1.6rem;
}

.resultado__mensagem {
  margin: 0;
  max-width: 32ch;
  opacity: 0.85;
}

.resultado__placar {
  padding: 1.25rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
  display: grid;
  gap: 0.5rem;
}

.placar__numero {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  color: var(--cor-primaria);
}

.placar__numero span {
  font-size: 1.4rem;
  opacity: 0.6;
}

.placar__rotulo,
.placar__detalhe {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.75;
}

.barra {
  height: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.barra__preenchimento {
  height: 100%;
  background: var(--cor-primaria);
  border-radius: 999px;
  transition: width 0.8s ease-out;
}

.resultado__acoes {
  display: grid;
  gap: 0.6rem;
}

.botao-secundario {
  margin-top: 0;
  text-align: center;
  background: var(--cor-secundaria);
}

@keyframes pop {
  0% { transform: scale(0.4); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .resultado__emoji,
  .barra__preenchimento {
    animation: none;
    transition: none;
  }
}
</style>