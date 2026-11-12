# Dados e IA do Easy Read

Este documento explica a parte de dados do app: como o livro chega ao celular, como as páginas lidas são registradas e como a IA gera o resumo e o quiz. As telas só precisam chamar as funções listadas aqui.

## Como funciona

```
public/livros/x.md  →  "Baixar livro"  →  IndexedDB (páginas)  →  leitor marca páginas lidas
                                                                          ↓
                         resumo + quiz salvos no IndexedDB  ←  /api/gerar-revisao (Gemini)
```

1. Os livros ficam em `public/livros/`, em Markdown, e são listados em `public/livros/catalogo.json`.
2. Quando a pessoa baixa um livro, o app busca o `.md`, divide em páginas com `paginar()` e grava no IndexedDB. Depois disso o livro abre sem internet.
3. O leitor registra cada página lida.
4. Na revisão, o app manda o texto das páginas escolhidas para a função `/api/gerar-revisao`, que chama o Gemini e devolve o resumo e as perguntas. O resultado fica salvo; pedir o mesmo intervalo de novo não chama a IA.

## Adicionar um livro

1. Converter o livro para Markdown (markitdown ou pandoc) e revisar o arquivo.
2. Salvar em `public/livros/<slug>.md`.
3. Acrescentar no `public/livros/catalogo.json`:

```json
{
  "slug": "pro-git",
  "titulo": "Pro Git",
  "autor": "Scott Chacon e Ben Straub",
  "descricao": "Texto curto para o card.",
  "categoria": "Ferramentas",
  "licenca": "CC BY-NC-SA 3.0",
  "arquivo": "livros/pro-git.md"
}
```

O `slug` não pode se repetir. Os dados e o sumário dos livros escolhidos pelo grupo (título, autor, categorias e seções de cada capítulo) estão em `docs/livros-planejados.json`; use o sumário para montar os títulos `#` e `##` do `.md`. O `livros/exemplo-git.md` é só um livro de teste e pode sair do catálogo quando os reais entrarem.

## Funções para as telas

### Biblioteca e livro (`src/services/livroService.ts`)

| Função | O que faz |
|---|---|
| `listarBiblioteca()` | Livros do catálogo com `baixado`, `livroId` e `totalPaginas`. Sem internet, devolve os já baixados. |
| `baixarLivro(item)` | Baixa, pagina e salva. Devolve o `Livro` com `id` e `totalPaginas`. Se já estiver baixado, só devolve. |
| `excluirLivroBaixado(livroId)` | Apaga o livro e tudo ligado a ele do aparelho. |

### Leitura (`src/services/leituraService.ts` e `dbService.ts`)

| Função | O que faz |
|---|---|
| `buscarPagina(livroId, numero)` | Uma página: `{ livroId, numero, md }`. O `md` deve ser mostrado com `marked` + `DOMPurify`. |
| `registrarLeitura(livroId, pagina)` | Marca a página como lida. Chamar ao avançar de página. |
| `buscarProgresso(livroId)` | `{ totalPaginas, paginasLidas, ultimaPaginaLida, percentual, paginaParaContinuar }` |
| `sugerirIntervalo(livroId)` | `{ inicio, fim }` com o que foi lido desde a última revisão, ou `null`. |

### Revisão (`src/services/revisaoService.ts`)

| Função | O que faz |
|---|---|
| `obterRevisao(livroId, inicio, fim, { gerarNova? })` | Devolve `{ id, resumo, perguntas[] }`. Usa a salva se existir; senão chama a IA. |
| `registrarResultado(revisaoId, acertos)` | Salva o resultado do quiz. |
| `buscarRevisoesPorLivro(livroId)` | Histórico de revisões do livro. |
| `buscarTentativasPorRevisao(revisaoId)` | Notas de cada vez que o quiz foi feito. |

Cada pergunta tem `{ pergunta, opcoes, respostaCorreta, pagina }`. O formato é o mesmo que o `useQuiz` espera (tipo `Quiz`), e `pagina` serve para mostrar "reveja a página X" quando a pessoa erra.

`obterRevisao` lança `ErroRevisao` com `tipo`:

- `offline`: sem internet e sem revisão salva para esse intervalo;
- `intervalo`: páginas inválidas ou mais de 50 de uma vez;
- `servidor`: a IA falhou ou devolveu algo fora do formato.

A `message` do erro já vem pronta para mostrar na tela.

Exemplo numa tela:

```ts
try {
  carregando.value = true
  revisao.value = await obterRevisao(livroId, inicio, fim)
} catch (e) {
  if (e instanceof ErroRevisao) erro.value = e.message
  else throw e
} finally {
  carregando.value = false
}
```

## A função de IA (`netlify/functions/gerar-revisao.ts`)

- Endereço: `POST /api/gerar-revisao`.
- Precisa da variável `GEMINI_API_KEY` no Netlify (Site configuration › Environment variables). A chave é criada no Google AI Studio e **nunca** vai para o código.
- `GEMINI_MODEL` é opcional (padrão `gemini-2.5-flash`). Se o Google trocar o nome do modelo, basta mudar a variável.
- A função confere a resposta da IA: descarta perguntas cuja resposta certa não está entre as opções e tenta de novo uma vez se vier algo inválido.

### Testar a IA no computador

`npm run dev` não roda a função. Para testar a IA localmente:

```bash
npx netlify login
npx netlify link
npx netlify dev
```

O `netlify dev` usa a chave cadastrada no Netlify. No Deploy Preview de cada PR a função já funciona.

## Banco (IndexedDB / Dexie)

Versão 5 do `EasyReadDB`:

| Tabela | Chave | Guarda |
|---|---|---|
| `livros` | `++id`, `&slug` | livros baixados |
| `paginas` | `[livroId+numero]` | o Markdown de cada página |
| `leituras` | `[livroId+pagina]` | páginas lidas |
| `revisoes` | `++id`, `[livroId+inicio+fim]` | resumo e perguntas gerados |
| `tentativas` | `++id`, `revisaoId` | resultado de cada quiz |

As tabelas antigas (capítulos, resumos e quizzes fixos) são apagadas automaticamente na atualização. Próxima mudança de estrutura: `version(6)`.

## Paginação

`src/services/paginacao.ts` divide o Markdown em páginas de cerca de 300 palavras, cortando só entre blocos, sem quebrar código, sem deixar título sozinho no fim e começando página nova nos títulos `#` e `##`. **Não altere `PALAVRAS_POR_PAGINA`** depois que o app estiver em uso: as páginas de quem já baixou deixariam de bater com as de quem baixar depois.

## Testes

```bash
npm test
```

Cobrem a paginação, o download, as páginas lidas, a revisão (com a IA simulada), a migração do banco antigo e a função de IA.
