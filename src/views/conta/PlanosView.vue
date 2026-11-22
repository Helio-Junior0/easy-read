<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { conta, escolherPlano, revisoesRestantesHoje } from '../../services/contaService'
import { PLANOS, buscarPlano, formatarPreco, type Plano } from '../../shared/planos'

const route = useRoute()

const boasVindas = computed(() => route.query.boasVindas === '1')
const atual = computed(() => buscarPlano(conta.usuario?.plano))
const restantes = computed(() => revisoesRestantesHoje(conta.usuario))

// Checkout simulado
const escolhido = ref<Plano | null>(null)
const confirmando = ref(false)
const aviso = ref('')
const erro = ref('')

function abrir(plano: Plano) {
  aviso.value = ''
  erro.value = ''
  if (plano.id === atual.value.id) return
  escolhido.value = plano
}

function fechar() {
  if (!confirmando.value) escolhido.value = null
}

async function confirmar() {
  if (!escolhido.value) return
  confirmando.value = true
  erro.value = ''
  try {
    // Simula o tempo de processamento de um pagamento
    await new Promise((ok) => setTimeout(ok, 900))
    await escolherPlano(escolhido.value.id)
    aviso.value = `Pronto! Agora você está no plano ${escolhido.value.nome}.`
    escolhido.value = null
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    confirmando.value = false
  }
}

function precoPartes(valor: number): { inteiro: string; centavos: string } {
  const [inteiro, centavos] = valor.toFixed(2).split('.')
  return { inteiro, centavos }
}
</script>

<template>
  <section class="planos">
    <header class="topo">
      <p class="rotulo">{{ boasVindas ? 'Conta criada' : 'Planos' }}</p>
      <h1>{{ boasVindas ? `Bem-vindo, ${conta.usuario?.nome.split(' ')[0]}!` : 'Escolha seu plano' }}</h1>
      <p class="topo__texto">
        Todos os planos dão acesso à biblioteca inteira e à leitura offline. O que muda é quantas revisões com
        resumo e quiz a IA gera para você por dia.
      </p>
      <p class="topo__atual">
        Seu plano: <strong>{{ atual.nome }}</strong>
        <template v-if="restantes !== null"> · {{ restantes }} de {{ atual.revisoesPorDia }} revisões disponíveis hoje</template>
      </p>
    </header>

    <p v-if="aviso" class="aviso" role="status">
      {{ aviso }} <RouterLink to="/">Ir para a biblioteca</RouterLink>
    </p>
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <ul class="grade">
      <li v-for="plano in PLANOS" :key="plano.id">
        <article class="plano" :class="{ 'plano--destaque': plano.destaque, 'plano--atual': plano.id === atual.id }">
          <span v-if="plano.destaque" class="plano__selo">Mais escolhido</span>
          <h2 class="plano__nome">{{ plano.nome }}</h2>
          <p class="plano__descricao">{{ plano.descricao }}</p>

          <p class="preco">
            <template v-if="plano.precoMensal === 0">
              <span class="preco__moeda">R$</span>
              <span class="preco__valor">0</span>
              <span class="preco__periodo">/mês</span>
            </template>
            <template v-else>
              <span class="preco__moeda">R$</span>
              <span class="preco__valor">{{ precoPartes(plano.precoMensal).inteiro }}</span>
              <span class="preco__centavos">,{{ precoPartes(plano.precoMensal).centavos }}</span>
              <span class="preco__periodo">/mês</span>
            </template>
          </p>

          <ul class="vantagens">
            <li v-for="v in plano.vantagens" :key="v">{{ v }}</li>
          </ul>

          <button
            type="button"
            class="plano__botao"
            :class="{ 'plano__botao--cheio': plano.destaque && plano.id !== atual.id }"
            :disabled="plano.id === atual.id"
            @click="abrir(plano)"
          >
            {{ plano.id === atual.id ? 'Plano atual' : plano.precoMensal === 0 ? 'Mudar para o Grátis' : `Assinar ${plano.nome}` }}
          </button>
        </article>
      </li>
    </ul>

    <p class="nota">
      Projeto acadêmico: os pagamentos são simulados. Nenhum valor é cobrado e nenhum dado de cartão é pedido.
    </p>

    <!-- Checkout simulado -->
    <div v-if="escolhido" class="fundo-modal" @click.self="fechar">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-checkout">
        <p class="rotulo">Confirmar plano</p>
        <h2 id="titulo-checkout">{{ escolhido.nome }}</h2>

        <dl class="resumo">
          <div>
            <dt>Plano</dt>
            <dd>{{ escolhido.nome }}</dd>
          </div>
          <div>
            <dt>Revisões com IA</dt>
            <dd>{{ escolhido.revisoesPorDia }} por dia</dd>
          </div>
          <div class="resumo__total">
            <dt>Total</dt>
            <dd>{{ escolhido.precoMensal === 0 ? 'Grátis' : `${formatarPreco(escolhido.precoMensal)}/mês` }}</dd>
          </div>
        </dl>

        <p class="modal__aviso">
          <strong>Pagamento simulado.</strong> Este é um projeto acadêmico: ao confirmar, o plano muda na sua conta e
          nada é cobrado.
        </p>

        <div class="modal__acoes">
          <button type="button" class="botao-principal" :disabled="confirmando" @click="confirmar">
            {{ confirmando ? 'Processando…' : 'Confirmar' }}
          </button>
          <button type="button" class="modal__cancelar" :disabled="confirmando" @click="fechar">Cancelar</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.planos {
  max-width: 1120px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
}

.topo {
  max-width: 680px;
  margin: 0 auto 2.25rem;
  text-align: center;
}

.topo h1 {
  margin: 0 0 0.75rem;
  font-size: 2.6rem;
}

.topo__texto {
  margin: 0 0 1rem;
  color: var(--cor-texto-suave);
  line-height: 1.6;
}

.topo__atual {
  display: inline-block;
  margin: 0;
  padding: 0.45rem 1rem;
  font-size: 0.9rem;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 999px;
}

.aviso,
.erro {
  max-width: 680px;
  margin: 0 auto 1.5rem;
  padding: 0.8rem 1rem;
  font-weight: 600;
  background: var(--cor-superficie);
  border-radius: 12px;
}

.aviso {
  color: var(--cor-acerto);
  border-left: 4px solid var(--cor-acerto);
}

.erro {
  color: var(--cor-erro);
  border-left: 4px solid var(--cor-erro);
}

.grade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: stretch;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plano {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem 1.75rem 1.75rem;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 22px;
}

.plano--destaque {
  border: 2px solid var(--cor-primaria);
  box-shadow: var(--sombra);
}

.plano--atual {
  background: color-mix(in srgb, var(--cor-destaque) 35%, var(--cor-superficie));
}

.plano__selo {
  position: absolute;
  top: -0.8rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.3rem 0.9rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
  border-radius: 999px;
}

.plano__nome {
  margin: 0;
  font-size: 1.9rem;
}

.plano__descricao {
  margin: 0.25rem 0 1.25rem;
  color: var(--cor-texto-suave);
}

.preco {
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
  margin: 0 0 1.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--cor-borda);
  color: var(--cor-texto);
}

.preco__moeda {
  align-self: flex-start;
  margin-top: 0.45rem;
  font-weight: 700;
}

.preco__valor {
  font-family: var(--fonte-titulo);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: lining-nums;
}

.preco__centavos {
  font-size: 1.2rem;
  font-weight: 700;
}

.preco__periodo {
  margin-left: 0.2rem;
  color: var(--cor-texto-suave);
}

.vantagens {
  display: grid;
  gap: 0.65rem;
  margin: 0 0 1.75rem;
  padding: 0;
  list-style: none;
  font-size: 0.95rem;
}

.vantagens li {
  display: flex;
  gap: 0.6rem;
}

.vantagens li::before {
  content: '✓';
  flex-shrink: 0;
  font-weight: 700;
  color: var(--cor-primaria);
}

.plano__botao {
  min-height: 48px;
  margin-top: auto;
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  background: transparent;
  border: 1px solid var(--cor-primaria);
  border-radius: 999px;
  cursor: pointer;
}

.plano__botao:hover:not(:disabled) {
  background: color-mix(in srgb, var(--cor-primaria) 6%, transparent);
}

.plano__botao--cheio {
  color: var(--cor-texto-claro);
  background: var(--cor-primaria);
}

.plano__botao--cheio:hover:not(:disabled) {
  background: var(--cor-primaria-escura);
}

.plano__botao:disabled {
  color: var(--cor-texto-suave);
  border-color: var(--cor-borda);
  cursor: default;
}

.nota {
  margin: 1.75rem 0 0;
  font-size: 0.85rem;
  text-align: center;
  color: var(--cor-texto-suave);
}

/* Modal */
.fundo-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(30, 15, 12, 0.55);
}

.modal {
  width: 100%;
  max-width: 440px;
  padding: 1.75rem;
  background: var(--cor-superficie);
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.modal h2 {
  margin: 0 0 1rem;
  font-size: 1.8rem;
}

.resumo {
  display: grid;
  gap: 0.6rem;
  margin: 0 0 1rem;
}

.resumo div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.resumo dt {
  color: var(--cor-texto-suave);
}

.resumo dd {
  margin: 0;
  font-weight: 600;
}

.resumo__total {
  padding-top: 0.6rem;
  border-top: 1px solid var(--cor-borda);
}

.resumo__total dd {
  font-size: 1.15rem;
  font-weight: 700;
}

.modal__aviso {
  padding: 0.75rem 0.9rem;
  font-size: 0.88rem;
  line-height: 1.5;
  background: color-mix(in srgb, var(--cor-destaque) 45%, #fff);
  border-radius: 10px;
}

.modal__acoes {
  display: grid;
  gap: 0.5rem;
}

.modal__acoes .botao-principal {
  width: 100%;
}

.modal__cancelar {
  min-height: 44px;
  font: inherit;
  font-weight: 600;
  color: var(--cor-primaria);
  background: none;
  border: 0;
  cursor: pointer;
}

@media (max-width: 860px) {
  .grade {
    grid-template-columns: 1fr;
    max-width: 460px;
    margin: 0 auto;
    gap: 1.5rem;
  }

  .topo h1 {
    font-size: 2.1rem;
  }
}
</style>
