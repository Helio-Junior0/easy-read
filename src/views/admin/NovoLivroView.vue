<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { adicionarLivro, lerArquivoMd } from '../../services/adminService'
import { paginar } from '../../services/paginacao'
import { gerarSlug } from '../../shared/livroFormato'

const router = useRouter()

const titulo = ref('')
const autor = ref('')
const descricao = ref('')
const categoria = ref('')
const licenca = ref('')

const arquivo = ref<File | null>(null)
const infoArquivo = ref<{ paginas: number; tamanho: string } | null>(null)
const erroArquivo = ref('')
const erro = ref('')
const enviando = ref(false)

const slug = computed(() => gerarSlug(titulo.value))

function tamanhoLegivel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function aoEscolherArquivo(evento: Event) {
  const campo = evento.target as HTMLInputElement
  const escolhido = campo.files?.[0] ?? null

  arquivo.value = null
  infoArquivo.value = null
  erroArquivo.value = ''
  if (!escolhido) return

  try {
    const md = await lerArquivoMd(escolhido)
    arquivo.value = escolhido
    infoArquivo.value = { paginas: paginar(md).length, tamanho: tamanhoLegivel(escolhido.size) }

    // Sugere o título a partir do primeiro "# Título" do arquivo
    if (!titulo.value.trim()) {
      const primeiroTitulo = /^#\s+(.+)$/m.exec(md)?.[1]?.trim()
      if (primeiroTitulo && primeiroTitulo.length <= 150) titulo.value = primeiroTitulo
    }
  } catch (e) {
    erroArquivo.value = (e as Error).message
    campo.value = ''
  }
}

async function enviar() {
  if (!arquivo.value) {
    erroArquivo.value = 'Escolha o arquivo .md do livro.'
    return
  }
  erro.value = ''
  enviando.value = true
  try {
    const livro = await adicionarLivro(
      {
        titulo: titulo.value,
        autor: autor.value,
        descricao: descricao.value,
        categoria: categoria.value,
        licenca: licenca.value,
      },
      arquivo.value,
    )
    router.push({ path: '/admin/livros', query: { adicionado: livro.titulo } })
  } catch (e) {
    erro.value = (e as Error).message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="admin">
    <p class="rotulo">Administração</p>
    <h1>Adicionar livro</h1>
    <p class="apoio">
      O livro precisa estar em Markdown (.md). Depois de adicionado, ele aparece na biblioteca de todos os leitores.
    </p>

    <form class="formulario" @submit.prevent="enviar">
      <label class="campo">
        <span>Arquivo do livro (.md) *</span>
        <input type="file" accept=".md,text/markdown" required @change="aoEscolherArquivo" />
        <small v-if="infoArquivo" class="campo__ok">
          Arquivo aceito: {{ infoArquivo.tamanho }}, {{ infoArquivo.paginas }} páginas no app.
        </small>
        <small v-if="erroArquivo" class="campo__erro" role="alert">{{ erroArquivo }}</small>
      </label>

      <label class="campo">
        <span>Título *</span>
        <input v-model="titulo" type="text" maxlength="150" required />
        <small v-if="slug">Endereço interno: {{ slug }}</small>
      </label>

      <label class="campo">
        <span>Autor *</span>
        <input v-model="autor" type="text" maxlength="150" required />
      </label>

      <label class="campo">
        <span>Descrição</span>
        <textarea v-model="descricao" rows="3" maxlength="600" />
        <small>Aparece no card do livro. {{ descricao.length }}/600</small>
      </label>

      <div class="dupla">
        <label class="campo">
          <span>Categoria</span>
          <input v-model="categoria" type="text" maxlength="40" placeholder="Ex.: Programação" />
        </label>

        <label class="campo">
          <span>Licença</span>
          <input v-model="licenca" type="text" maxlength="120" placeholder="Ex.: CC BY-NC 3.0" />
        </label>
      </div>

      <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

      <div class="acoes">
        <button type="submit" class="botao-principal" :disabled="enviando">
          {{ enviando ? 'Enviando…' : 'Adicionar livro' }}
        </button>
        <RouterLink to="/admin/livros" class="cancelar">Cancelar</RouterLink>
      </div>
    </form>
  </section>
</template>

<style scoped>
.admin {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.admin h1 {
  margin: 0 0 0.5rem;
}

.apoio {
  opacity: 0.8;
}

.formulario {
  display: grid;
  gap: 1.1rem;
  padding: 1.5rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
}

.campo {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
  min-width: 0;
}

.campo input[type='text'],
.campo textarea {
  width: 100%;
  min-height: 48px;
  padding: 0.6rem 0.9rem;
  font: inherit;
  font-weight: 400;
  background: var(--cor-fundo);
  border: 2px solid transparent;
  border-radius: 10px;
}

.campo input[type='file'] {
  width: 100%;
  padding: 0.75rem;
  font: inherit;
  font-weight: 400;
  background: var(--cor-fundo);
  border: 2px dashed var(--cor-secundaria);
  border-radius: 10px;
}

.campo input:focus,
.campo textarea:focus {
  border-color: var(--cor-primaria);
  outline: none;
}

.campo small {
  font-weight: 400;
  opacity: 0.75;
}

.campo .campo__ok {
  font-weight: 600;
  color: var(--cor-acerto);
  opacity: 1;
}

.campo .campo__erro,
.erro {
  margin: 0;
  font-weight: 600;
  color: var(--cor-erro);
  opacity: 1;
}

.dupla {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.cancelar {
  font-weight: 600;
}

@media (max-width: 600px) {
  .formulario {
    padding: 1.1rem;
  }

  .dupla {
    grid-template-columns: 1fr;
  }
}
</style>
