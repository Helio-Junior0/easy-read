<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BotaoVoltar from '../components/BotaoVoltar.vue'

const props = defineProps<{ id: string }>()

// Dados de exemplo: ainda não vêm do banco
const concluidos = ref<number[]>([1])

const capitulos = computed(() => {
  const base = (Number(props.id) - 1) * 3
  return [1, 2, 3].map((numero) => {
    const idGlobal = base + numero
    const feito = concluidos.value.includes(idGlobal)
    return {
      id: idGlobal,
      numero,
      titulo: `Capítulo de exemplo ${numero}`,
      paginas: 12 + numero * 4,
      status: feito ? 'concluido' : 'pendente',
    }
  })
})

const totalConcluidos = computed(
  () => capitulos.value.filter((c) => c.status === 'concluido').length,
)

const progresso = computed(() =>
  Math.round((totalConcluidos.value / capitulos.value.length) * 100),
)

const rotuloStatus = {
  concluido: 'Concluído',
  pendente: 'Pendente',
} as const
</script>

<template>
  <section class="livro">
    <BotaoVoltar fallback="/" />

    <div class="capa-bloco">
      <div class="capa" aria-hidden="true">
        <span class="capa__numero">{{ id }}</span>
        <span class="capa__texto">Livro</span>
      </div>

      <div class="info">
        <p class="rotulo">Livro #{{ id }}</p>
        <h1 class="titulo">Título do livro</h1>
        <p class="autor">Autor do livro</p>

        <div class="stats">
          <div class="stat">
            <span class="stat__valor">{{ capitulos.length }}</span>
            <span class="stat__rotulo">capítulos</span>
          </div>
          <div class="stat">
            <span class="stat__valor">{{ capitulos.length }}</span>
            <span class="stat__rotulo">quizzes</span>
          </div>
          <div class="stat">
            <span class="stat__valor">{{ totalConcluidos }}</span>
            <span class="stat__rotulo">concluídos</span>
          </div>
        </div>

        <div class="progresso">
          <div class="progresso__info">
            <span>Progresso</span>
            <span>{{ progresso }}%</span>
          </div>
          <div class="progresso__barra" role="progressbar" :aria-valuenow="progresso" aria-valuemin="0" aria-valuemax="100">
            <div class="progresso__preenchimento" :style="{ width: progresso + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <div class="secao-cabecalho">
      <h2 class="secao-titulo">Capítulos</h2>
      <span class="secao-contagem">{{ totalConcluidos }}/{{ capitulos.length }} concluídos</span>
    </div>

    <ul class="grade">
      <li v-for="capitulo in capitulos" :key="capitulo.id">
        <RouterLink
          :to="`/capitulo/${capitulo.id}`"
          class="card"
          :class="{ 'card--concluido': capitulo.status === 'concluido' }"
        >
          <div class="card__topo">
            <span class="card__numero">Capítulo {{ capitulo.numero }}</span>
            <span class="selo" :class="`selo--${capitulo.status}`">
              {{ rotuloStatus[capitulo.status] }}
            </span>
          </div>

          <h3 class="card__titulo">{{ capitulo.titulo }}</h3>

          <div class="card__meta">
            <span>{{ capitulo.paginas }} páginas</span>
            <span>·</span>
            <span>Quiz de 4 perguntas</span>
          </div>

          <div class="card__rodape">
            <span class="card__acao">
              {{ capitulo.status === 'concluido' ? 'Revisar capítulo' : 'Começar capítulo' }}
            </span>
            <span class="card__seta" aria-hidden="true">→</span>
          </div>
        </RouterLink>
      </li>
    </ul>
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

/* Grade de capítulos */
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: 0.6rem;
  height: 100%;
  padding: 1.1rem 1.2rem;
  background: var(--cor-superficie);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-top: 4px solid var(--cor-secundaria);
  border-radius: var(--raio);
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
}

.card--concluido {
  border-top-color: var(--cor-destaque);
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
}

.card:focus-visible {
  outline: 2px solid var(--cor-primaria);
  outline-offset: 3px;
}

.card__topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.card__numero {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.65;
}

.selo {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
}

.selo--pendente {
  background: rgba(0, 0, 0, 0.07);
}

.selo--concluido {
  background: var(--cor-destaque);
  color: var(--cor-primaria);
}

.card__titulo {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.3;
}

.card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.85rem;
  opacity: 0.7;
}

.card__rodape {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 0.6rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.12);
}

.card__acao {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--cor-primaria);
}

.card__seta {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--cor-primaria);
  transition: transform 0.15s;
}

.card:hover .card__seta {
  transform: translateX(3px);
}

@media (max-width: 700px) {
  .capa-bloco {
    grid-template-columns: 1fr;
  }

  .capa {
    min-height: 160px;
  }

  .titulo {
    font-size: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .card__seta,
  .progresso__preenchimento {
    transition: none;
  }

  .card:hover {
    transform: none;
  }
}
</style>