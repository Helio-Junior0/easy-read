<script setup lang="ts">
import { computed } from 'vue'
import { renderizarMarkdown } from '../services/markdown'

// simples = texto curto (ex.: resumo): sem letra capitular e alinhado à esquerda
const props = defineProps<{ md: string; simples?: boolean }>()

const html = computed(() => renderizarMarkdown(props.md))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown" :class="{ 'markdown--simples': simples }" v-html="html" />
</template>

<style scoped>
/* As cores vêm de variáveis para o leitor poder trocar o tema (claro, rosé, escuro) */
.markdown {
  --md-tinta: var(--leitura-tinta, var(--cor-texto));
  --md-destaque: var(--leitura-destaque, var(--cor-primaria));
  --md-borda: var(--leitura-borda, var(--cor-borda));
  --md-citacao: var(--leitura-citacao, #f3e7e4);

  font-family: var(--fonte-titulo);
  font-size: 1.25rem;
  font-weight: 500;
  font-variant-numeric: lining-nums;
  line-height: 1.75;
  color: var(--md-tinta);
  overflow-wrap: break-word;
}

.markdown :deep(p) {
  margin: 0 0 1.4em;
  text-align: justify;
  hyphens: auto;
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3),
.markdown :deep(h4) {
  margin: 1.5em 0 0.6em;
  font-family: var(--fonte-titulo);
  font-weight: 700;
  line-height: 1.2;
  color: var(--md-tinta);
}

/* Título de capítulo: grande, centralizado e com a linha fina embaixo */
.markdown :deep(h1) {
  margin: 0.2em 0 1.2em;
  padding-bottom: 0.9em;
  font-size: 2em;
  text-align: center;
  border-bottom: 1px solid var(--md-borda);
}

.markdown :deep(h2) {
  font-size: 1.4em;
}

.markdown :deep(h3) {
  font-size: 1.18em;
}

.markdown :deep(> :first-child) {
  margin-top: 0;
}

/* Letra capitular no começo do capítulo e no começo da página */
.markdown:not(.markdown--simples) :deep(> h1 + p::first-letter),
.markdown:not(.markdown--simples) :deep(> p:first-child::first-letter) {
  float: left;
  margin: 0.08em 0.12em 0 0;
  font-size: 3.4em;
  font-weight: 700;
  line-height: 0.82;
  color: var(--md-destaque);
}

.markdown :deep(a) {
  color: var(--md-destaque);
}

.markdown :deep(ul),
.markdown :deep(ol) {
  margin: 0 0 1.4em;
  padding-left: 1.4em;
}

.markdown :deep(li) {
  margin-bottom: 0.4em;
}

.markdown :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.4em auto;
  border-radius: 10px;
}

.markdown :deep(code) {
  font-family: var(--fonte-codigo);
  font-size: 0.72em;
  font-weight: 400;
  padding: 0.12em 0.4em;
  background: color-mix(in srgb, var(--md-tinta) 9%, transparent);
  border-radius: 5px;
}

.markdown :deep(pre) {
  margin: 0 0 1.5em;
  padding: 1rem 1.1rem;
  overflow-x: auto;
  font-family: var(--fonte-codigo);
  font-size: 0.72em;
  line-height: 1.6;
  text-align: left;
  color: #f4e9e4;
  background: #241417;
  border-left: 4px solid var(--cor-secundaria);
  border-radius: 10px;
}

.markdown :deep(pre code) {
  padding: 0;
  font-size: inherit;
  color: inherit;
  background: none;
}

/* Citação: faixa com borda vinho, como no destaque do livro */
.markdown :deep(blockquote) {
  margin: 0 0 1.5em;
  padding: 1em 1.3em;
  font-style: italic;
  color: var(--md-destaque);
  background: var(--md-citacao);
  border-left: 4px solid var(--md-destaque);
  border-radius: 0 10px 10px 0;
}

.markdown :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.markdown :deep(table) {
  display: block;
  max-width: 100%;
  margin: 0 0 1.5em;
  overflow-x: auto;
  font-family: var(--fonte-texto);
  font-size: 0.75em;
  font-weight: 400;
  border-collapse: collapse;
}

.markdown :deep(th),
.markdown :deep(td) {
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--md-borda);
  text-align: left;
}

.markdown :deep(th) {
  font-weight: 700;
  background: var(--md-citacao);
}

.markdown :deep(hr) {
  margin: 1.8em 0;
  border: 0;
  border-top: 1px solid var(--md-borda);
}

@media (max-width: 600px) {
  .markdown :deep(h1) {
    font-size: 1.55em;
  }
}

.markdown--simples :deep(p) {
  text-align: left;
  hyphens: manual;
}
</style>
