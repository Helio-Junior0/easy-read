import { ref, computed, unref, type MaybeRef } from 'vue'
import type { Quiz } from '../types'

const normalizar = (s: string) => s.trim().toLowerCase()

export function useQuiz(perguntas: MaybeRef<Quiz[]>) {
  const indiceAtual = ref(0)
  const opcaoSelecionada = ref<number | null>(null)
  const confirmada = ref(false)
  const pontos = ref(0)
  const finalizado = ref(false)

  const lista = computed(() => unref(perguntas))
  const total = computed(() => lista.value.length)
  const perguntaAtual = computed(() => lista.value[indiceAtual.value])
  const ehUltima = computed(() => indiceAtual.value === total.value - 1)
  const podeConfirmar = computed(
    () => opcaoSelecionada.value !== null && !confirmada.value
  )

  const acertou = computed(() => {
    const p = perguntaAtual.value
    if (!confirmada.value || opcaoSelecionada.value === null || !p) return false
    return normalizar(p.opcoes[opcaoSelecionada.value]) === normalizar(p.respostaCorreta)
  })

  function selecionar(indice: number) {
    if (confirmada.value) return
    opcaoSelecionada.value = indice
  }

  function confirmar() {
    if (!podeConfirmar.value) return
    confirmada.value = true
    if (acertou.value) pontos.value++
  }

  function proxima() {
    if (!confirmada.value) return
    if (ehUltima.value) {
      finalizado.value = true
      return
    }
    indiceAtual.value++
    opcaoSelecionada.value = null
    confirmada.value = false
  }

  function reiniciar() {
    indiceAtual.value = 0
    opcaoSelecionada.value = null
    confirmada.value = false
    pontos.value = 0
    finalizado.value = false
  }

  return {
    indiceAtual, perguntaAtual, total, pontos,
    opcaoSelecionada, confirmada, acertou, podeConfirmar,
    ehUltima, finalizado,
    selecionar, confirmar, proxima, reiniciar,
  }
}