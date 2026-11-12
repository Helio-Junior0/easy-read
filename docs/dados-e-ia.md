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

Há dois jeitos, e os dois aparecem juntos na biblioteca.

### Pelo painel de admin (recomendado)

1. Abra `/admin/login` (link "Área do administrador" no rodapé) e entre com a senha.
2. No menu lateral, clique em **Adicionar livro**.
3. Escolha o arquivo `.md`, preencha título e autor (descrição, categoria e licença são opcionais) e envie.

O painel só aceita `.md` de texto, com até 4 MB. O livro fica guardado no Netlify (Netlify Blobs) e aparece na hora para todos os leitores. Em **Gerenciar livros** dá para excluir. Quem já baixou um livro continua com ele no aparelho.

A senha do admin fica na variável `ADMIN_PASSWORD` do Netlify (Site configuration › Environment variables), com no mínimo 8 caracteres. Ela não vai no código. O login vale por 8 horas.

### Direto no projeto

Para livros que devem vir junto com o app:

1. Salvar o `.md` em `public/livros/<slug>.md`.
2. Acrescentar no `public/livros/catalogo.json`:

```json
{
  "slug": "pense-em-python",
  "titulo": "Pense em Python",
  "autor": "Allen B. Downey",
  "descricao": "Texto curto para o card.",
  "categoria": "Programação",
  "licenca": "CC BY-NC 3.0",
  "arquivo": "livros/pense-em-python.md"
}
```

O `slug` não pode se repetir. Os dados e o sumário dos outros livros escolhidos pelo grupo estão em `docs/livros-planejados.json`.

## Telas

| Endereço | Tela |
|---|---|
| `/` | Biblioteca: catálogo, busca, filtros e "Baixar livro" |
| `/livro/:id` | Livro: progresso, continuar leitura e revisões feitas |
| `/livro/:id/pagina/:n` | Leitor: uma página por vez, marca como lida ao avançar |
| `/livro/:id/revisao` | Revisão: escolher páginas, resumo e quiz da IA |
| `/admin/login` | Login do administrador |
| `/admin/livros` | Gerenciar livros (só admin) |
| `/admin/livros/novo` | Adicionar livro (só admin) |

A barra lateral só aparece para o admin logado. As telas de admin são protegidas no navegador, mas a proteção de verdade é no servidor: sem o token do login, as funções recusam adicionar ou excluir.

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

## Funções do servidor (Netlify Functions)

| Endereço | Para quê |
|---|---|
| `GET /api/livros` | catálogo dos livros do painel |
| `GET /api/livros/:slug` | o `.md` de um livro |
| `POST /api/livros` | adicionar livro (admin) |
| `DELETE /api/livros/:slug` | excluir livro (admin) |
| `POST /api/admin/login` | login do admin |
| `POST /api/gerar-revisao` | resumo + quiz pela IA |

### Testar as funções no computador

`npm run dev` não roda as funções: a biblioteca mostra só os livros do projeto, e o painel e a IA respondem com erro. Para testar tudo localmente:

```bash
npx netlify login
npx netlify link
npx netlify dev
```

O `netlify dev` usa as variáveis cadastradas no Netlify. No Deploy Preview de cada PR as funções já funcionam.

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

`src/services/paginacao.ts` divide o Markdown em páginas de cerca de 300 palavras, cortando só entre blocos, sem quebrar código e sem deixar título sozinho no fim. Título de capítulo (`#`) sempre começa página nova; título de seção (`##`) começa página nova quando a anterior já tem conteúdo. **Não altere `PALAVRAS_POR_PAGINA`** depois que o app estiver em uso: as páginas de quem já baixou deixariam de bater com as de quem baixar depois.

## Testes

```bash
npm test
```

Cobrem a paginação, o download, as páginas lidas, a revisão (com a IA simulada), a migração do banco antigo, a função de IA, o login do admin e o envio de livros.
