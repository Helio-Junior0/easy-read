<script setup lang="ts">
import BotaoVoltar from '../components/BotaoVoltar.vue'

const props = defineProps<{ id: string }>()

// Pergunta de exemplo: ainda sem lógica de resposta
const pergunta = 'Onde o narrador encontrou o rapaz que lhe deu o apelido?'
const opcoes = ['No trem da Central', 'Na praça', 'Na livraria', 'Na igreja']
const nomeGrupo = `quiz-capitulo-${props.id}`
</script>

<template>
  <section>
    <BotaoVoltar :fallback="`/capitulo/${id}`" />

    <p class="rotulo">Quiz do capítulo #{{ id }}</p>

    <fieldset class="pergunta">
      <legend class="pergunta__enunciado">{{ pergunta }}</legend>

      <label v-for="(opcao, indice) in opcoes" :key="opcao" class="alternativa">
        <input type="radio" :name="nomeGrupo" :value="indice" />
        <span>{{ opcao }}</span>
      </label>
    </fieldset>

    <button type="button" class="botao-principal" disabled>Confirmar resposta</button>
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
</style>
