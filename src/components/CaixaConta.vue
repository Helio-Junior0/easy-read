<script setup lang="ts">
// Moldura das telas de entrar e de cadastro: marca à esquerda (no computador) e formulário à direita
defineProps<{ titulo: string; subtitulo: string }>()
</script>

<template>
  <section class="conta">
    <div class="conta__painel">
      <aside class="conta__marca" aria-hidden="true">
        <span class="conta__simbolo">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6.5c-1.6-1.2-3.8-1.8-6.5-1.8v12.6c2.7 0 4.9.6 6.5 1.8 1.6-1.2 3.8-1.8 6.5-1.8V4.7c-2.7 0-4.9.6-6.5 1.8Z" />
            <path d="M12 6.5v12.6" />
          </svg>
        </span>
        <p class="conta__nome">Easy Read</p>
        <p class="conta__frase">Leia no seu ritmo. Revise com resumo e quiz feitos por IA.</p>
        <ul class="conta__lista">
          <li>Livros técnicos para ler offline</li>
          <li>Resumo do trecho que você leu</li>
          <li>Quiz que aponta a página da resposta</li>
        </ul>
      </aside>

      <div class="conta__form">
        <h1 class="conta__titulo">{{ titulo }}</h1>
        <p class="conta__subtitulo">{{ subtitulo }}</p>
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.conta {
  display: grid;
  place-items: center;
  min-height: calc(100svh - 84px);
  padding: 2rem 1rem 3rem;
}

.conta__painel {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
  width: 100%;
  max-width: 920px;
  overflow: hidden;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 24px;
  box-shadow: var(--sombra);
}

.conta__marca {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 2.75rem 2.25rem;
  color: var(--cor-texto-claro);
  background:
    radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--cor-secundaria) 35%, transparent), transparent 55%),
    var(--cor-primaria);
}

.conta__simbolo {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
}

.conta__nome {
  margin: 0.5rem 0 0;
  font-family: var(--fonte-titulo);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.conta__frase {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.35rem;
  line-height: 1.35;
}

.conta__lista {
  display: grid;
  gap: 0.6rem;
  margin: auto 0 0;
  padding: 1.5rem 0 0;
  list-style: none;
  font-size: 0.92rem;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
}

.conta__lista li::before {
  content: '✓';
  margin-right: 0.6rem;
  font-weight: 700;
  color: var(--cor-secundaria);
}

.conta__form {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 2.75rem 2.5rem;
}

.conta__titulo {
  margin: 0;
  font-size: 2.2rem;
}

.conta__subtitulo {
  margin: -0.5rem 0 0.5rem;
  color: var(--cor-texto-suave);
}

/* Campos e botões dos formulários de conta */
.conta__form :deep(.campo) {
  display: grid;
  gap: 0.35rem;
  font-size: 0.92rem;
  font-weight: 600;
}

.conta__form :deep(.campo input) {
  width: 100%;
  min-height: 50px;
  padding: 0 1rem;
  font: inherit;
  font-weight: 400;
  color: var(--cor-texto);
  background: #fff;
  border: 1px solid var(--cor-borda);
  border-radius: 12px;
}

.conta__form :deep(.campo input:focus) {
  border-color: var(--cor-primaria);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--cor-primaria) 18%, transparent);
}

.conta__form :deep(.campo small) {
  font-weight: 400;
  color: var(--cor-texto-suave);
}

.conta__form :deep(.erro) {
  margin: 0;
  padding: 0.7rem 0.9rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--cor-erro);
  background: color-mix(in srgb, var(--cor-erro) 8%, #fff);
  border-left: 4px solid var(--cor-erro);
  border-radius: 10px;
}

.conta__form :deep(.botao-principal) {
  width: 100%;
  margin-top: 0.25rem;
}

.conta__form :deep(.alternativa) {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  text-align: center;
  color: var(--cor-texto-suave);
}

.conta__form :deep(.alternativa a) {
  font-weight: 700;
}

.conta__form :deep(.aviso-local) {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  text-align: center;
  color: var(--cor-texto-suave);
}

@media (max-width: 760px) {
  .conta {
    padding: 1rem 0.75rem 2rem;
    place-items: start center;
  }

  .conta__painel {
    grid-template-columns: 1fr;
    border-radius: 20px;
  }

  .conta__marca {
    gap: 0.5rem;
    padding: 1.5rem 1.5rem 1.25rem;
  }

  .conta__simbolo,
  .conta__lista {
    display: none;
  }

  .conta__nome {
    margin: 0;
    font-size: 1.5rem;
  }

  .conta__frase {
    font-size: 1.1rem;
  }

  .conta__form {
    padding: 1.5rem;
  }

  .conta__titulo {
    font-size: 1.8rem;
  }
}
</style>
