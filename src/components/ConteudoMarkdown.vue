<script setup lang="ts">
import { computed } from 'vue'
import { renderizarMarkdown } from '../services/markdown'

const props = defineProps<{ md: string }>()

const html = computed(() => renderizarMarkdown(props.md))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown" v-html="html" />
</template>

<style scoped>
.markdown {
  font-size: 1.08rem;
  line-height: 1.75;
  overflow-wrap: break-word;
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3),
.markdown :deep(h4) {
  margin: 1.6em 0 0.6em;
  line-height: 1.25;
}

.markdown :deep(h1) {
  font-size: 1.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 3px solid var(--cor-destaque);
}

.markdown :deep(h2) {
  font-size: 1.3rem;
}

.markdown :deep(h3) {
  font-size: 1.12rem;
}

.markdown :deep(> :first-child) {
  margin-top: 0;
}

.markdown :deep(p) {
  margin: 0 0 1.1em;
}

.markdown :deep(ul),
.markdown :deep(ol) {
  margin: 0 0 1.1em;
  padding-left: 1.4rem;
}

.markdown :deep(li) {
  margin-bottom: 0.35em;
}

.markdown :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.2em auto;
  border-radius: 8px;
}

.markdown :deep(code) {
  font-family: ui-monospace, 'Cascadia Code', Consolas, Menlo, monospace;
  font-size: 0.92em;
  padding: 0.1em 0.35em;
  background: color-mix(in srgb, var(--cor-texto) 9%, transparent);
  border-radius: 5px;
}

.markdown :deep(pre) {
  margin: 0 0 1.2em;
  padding: 0.9rem 1rem;
  overflow-x: auto;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #f6ead9;
  background: #2a1a15;
  border-left: 4px solid var(--cor-destaque);
  border-radius: 8px;
}

.markdown :deep(pre code) {
  padding: 0;
  font-size: inherit;
  color: inherit;
  background: none;
}

.markdown :deep(blockquote) {
  margin: 0 0 1.1em;
  padding: 0.2rem 1rem;
  border-left: 4px solid var(--cor-secundaria);
  opacity: 0.9;
}

.markdown :deep(table) {
  display: block;
  max-width: 100%;
  margin: 0 0 1.2em;
  overflow-x: auto;
  border-collapse: collapse;
}

.markdown :deep(th),
.markdown :deep(td) {
  padding: 0.4rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--cor-texto) 22%, transparent);
  text-align: left;
}

.markdown :deep(th) {
  background: var(--cor-superficie);
}

.markdown :deep(hr) {
  margin: 1.6em 0;
  border: 0;
  border-top: 2px solid color-mix(in srgb, var(--cor-texto) 15%, transparent);
}
</style>
