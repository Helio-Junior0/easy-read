<script setup lang="ts">
// Mostra uma pergunta e as alternativas. Não guarda estado: só exibe e avisa o clique.
defineProps<{
  enunciado: string
  opcoes: string[]
  selecionada: number | null
  confirmada: boolean
  correta: number
}>()

const emit = defineEmits<{ selecionar: [indice: number] }>()

const letras = 'ABCDEFGH'
</script>

<template>
  <fieldset class="pergunta" :disabled="confirmada">
    <legend class="pergunta__enunciado">{{ enunciado }}</legend>

    <div class="alternativas">
      <label
        v-for="(opcao, i) in opcoes"
        :key="i"
        class="alternativa"
        :class="{
          'alternativa--marcada': selecionada === i,
          'alternativa--certa': confirmada && i === correta,
          'alternativa--errada': confirmada && selecionada === i && i !== correta,
        }"
      >
        <input
          type="radio"
          name="alternativa"
          class="alternativa__radio"
          :checked="selecionada === i"
          @change="emit('selecionar', i)"
        />
        <span class="alternativa__letra" aria-hidden="true">{{ letras[i] }}</span>
        <span class="alternativa__texto">{{ opcao }}</span>
        <span v-if="confirmada && i === correta" class="alternativa__marca">Correta</span>
        <span v-else-if="confirmada && selecionada === i" class="alternativa__marca">Sua resposta</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.pergunta {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.pergunta__enunciado {
  padding: 0;
  margin-bottom: 1rem;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: pre-wrap;
}

.alternativas {
  display: grid;
  gap: 0.65rem;
}

.alternativa {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  padding: 0.7rem 0.9rem;
  background: var(--cor-fundo);
  border: 2px solid color-mix(in srgb, var(--cor-texto) 14%, transparent);
  border-radius: var(--raio);
  cursor: pointer;
}

.alternativa__radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.alternativa:has(.alternativa__radio:focus-visible) {
  outline: 3px solid var(--cor-primaria);
  outline-offset: 2px;
}

.alternativa__letra {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  font-weight: 800;
  background: var(--cor-superficie);
  border-radius: 50%;
}

.alternativa__texto {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.alternativa__marca {
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.alternativa--marcada {
  border-color: var(--cor-primaria);
}

.alternativa--marcada .alternativa__letra {
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
}

.alternativa--certa {
  border-color: var(--cor-acerto);
  background: color-mix(in srgb, var(--cor-acerto) 14%, var(--cor-fundo));
}

.alternativa--certa .alternativa__letra {
  color: var(--cor-texto-claro);
  background: var(--cor-acerto);
}

.alternativa--certa .alternativa__marca {
  color: var(--cor-acerto);
}

.alternativa--errada {
  border-color: var(--cor-erro);
  background: color-mix(in srgb, var(--cor-erro) 10%, var(--cor-fundo));
}

.alternativa--errada .alternativa__marca {
  color: var(--cor-erro);
}

.pergunta:disabled .alternativa {
  cursor: default;
}
</style>
