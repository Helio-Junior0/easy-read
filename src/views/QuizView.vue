<script setup lang="ts">
import BotaoVoltar from '../components/BotaoVoltar.vue'
import { useQuiz } from '../composables/useQuiz'
import type { Quiz } from '../types'

const props = defineProps<{ id: string }>()

// Perguntas de exemplo: depois trocamos pelos dados do Dexie
const perguntas: Quiz[] = [
  {
    id: 1,
    capituloId: Number(props.id),
    pergunta: 'Onde o narrador encontrou o rapaz que lhe deu o apelido?',
    opcoes: ['No trem da Central', 'Na praça', 'Na livraria', 'Na igreja'],
    respostaCorreta: 'No trem da Central',
  },
  {
    id: 2,
    capituloId: Number(props.id),
    pergunta: 'Que apelido o narrador recebeu?',
    opcoes: ['Dom Casmurro', 'Bentinho', 'Capitu', 'Zé Dias'],
    respostaCorreta: 'Dom Casmurro',
  },
]

const nomeGrupo = `quiz-capitulo-${props.id}`

const {
  indiceAtual, perguntaAtual, total, pontos,
  opcaoSelecionada, confirmada, acertou, podeConfirmar,
  ehUltima, finalizado,
  selecionar, confirmar, proxima, reiniciar,
} = useQuiz(perguntas)

function classeResultado(opcao: string, indice: number) {
  if (!confirmada.value) return ''
  const certa = perguntaAtual.value.respostaCorreta.trim().toLowerCase()
  if (opcao.trim().toLowerCase() === certa) return 'alternativa--correta'
  if (indice === opcaoSelecionada.value) return 'alternativa--errada'
  return ''
}

function aoClicarBotao() {
  if (confirmada.value) proxima()
  else confirmar()
}
</script>

<template>
  <section>
    <BotaoVoltar :fallback="`/capitulo/${id}`" />

    <p class="rotulo">Quiz do capítulo #{{ id }}</p>

    <div v-if="finalizado" class="resultado">
      <h2>Você acertou {{ pontos }} de {{ total }}</h2>
      <button type="button" class="botao-principal" @click="reiniciar">
        Tentar de novo
      </button>
    </div>

    <template v-else-if="perguntaAtual">
      <p class="progresso">Pergunta {{ indiceAtual + 1 }} de {{ total }}</p>

      <fieldset class="pergunta">
        <legend class="pergunta__enunciado">{{ perguntaAtual.pergunta }}</legend>

        <label
          v-for="(opcao, indice) in perguntaAtual.opcoes"
          :key="opcao"
          :class="['alternativa', classeResultado(opcao, indice)]"
        >
          <input
            type="radio"
            :name="nomeGrupo"
            :value="indice"
            :checked="opcaoSelecionada === indice"
            :disabled="confirmada"
            @change="selecionar(indice)"
          />
          <span>{{ opcao }}</span>
        </label>
      </fieldset>

      <p v-if="confirmada" class="feedback">
        {{ acertou ? 'Acertou!' : `Errou. A resposta certa é: ${perguntaAtual.respostaCorreta}` }}
      </p>

      <button
        type="button"
        class="botao-principal"
        :disabled="!confirmada && !podeConfirmar"
        @click="aoClicarBotao"
      >
        {{ !confirmada ? 'Confirmar resposta' : ehUltima ? 'Ver resultado' : 'Próxima pergunta' }}
      </button>
    </template>
  </section>
</template>

<style scoped>
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

.alternativa {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  margin-bottom: 0.6rem;
  padding: 0.6rem 1rem;
  background: var(--cor-superficie);
  border: 2px solid transparent;
  border-radius: var(--raio);
  cursor: pointer;
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
label.alternativa.alternativa--correta {
  border-color: #2e9e5b;
}

label.alternativa.alternativa--errada {
  border-color: #d64545;
}

.progresso,
.feedback {
  margin: 0 0 1rem;
}

.resultado {
  text-align: center;
}



</style>
