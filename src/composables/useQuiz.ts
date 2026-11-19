// Lógica do quiz: uma pergunta por vez, confirmar, ver se acertou e avançar.
// Não sabe de onde as perguntas vêm; a tela só entrega a lista.
import { computed, ref, watch, type Ref } from 'vue'
import type { Quiz } from '../types/index'

export function useQuiz(perguntas: Ref<Quiz[]>) {
  const indice = ref(0)
  const selecionada = ref<number | null>(null)
  const confirmada = ref(false)
  const respostas = ref<(number | null)[]>([])
  const finalizado = ref(false)

  function reiniciar() {
    indice.value = 0
    selecionada.value = null
    confirmada.value = false
    respostas.value = perguntas.value.map(() => null)
    finalizado.value = false
  }

  watch(perguntas, reiniciar, { immediate: true })

  const total = computed(() => perguntas.value.length)
  const perguntaAtual = computed<Quiz | undefined>(() => perguntas.value[indice.value])
  const indiceCorreto = computed(() => {
    const p = perguntaAtual.value
    return p ? p.opcoes.indexOf(p.respostaCorreta) : -1
  })
  const ehUltima = computed(() => indice.value === total.value - 1)
  const podeConfirmar = computed(() => selecionada.value !== null && !confirmada.value)
  const acertou = computed(() => confirmada.value && selecionada.value === indiceCorreto.value)

  const acertos = computed(() =>
    perguntas.value.reduce(
      (soma, p, i) => soma + (respostas.value[i] === p.opcoes.indexOf(p.respostaCorreta) ? 1 : 0),
      0,
    ),
  )

  function selecionar(i: number) {
    if (!confirmada.value) selecionada.value = i
  }

  function confirmar() {
    if (!podeConfirmar.value) return
    respostas.value[indice.value] = selecionada.value
    confirmada.value = true
  }

  function proxima() {
    if (!confirmada.value) return
    if (ehUltima.value) {
      finalizado.value = true
      return
    }
    indice.value++
    selecionada.value = null
    confirmada.value = false
  }

  return {
    indice,
    total,
    perguntaAtual,
    indiceCorreto,
    selecionada,
    confirmada,
    acertou,
    ehUltima,
    podeConfirmar,
    acertos,
    finalizado,
    selecionar,
    confirmar,
    proxima,
    reiniciar,
  }
}
