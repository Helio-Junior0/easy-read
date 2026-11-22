# Easy Read

PWA de leitura desenvolvido como projeto integrador do curso de Engenharia de Software da UNIVAG. O leitor lê livros técnicos no próprio app, página por página, e pode revisar o trecho lido com um resumo e um quiz gerados por inteligência artificial. A leitura funciona offline depois que o livro é baixado.

Acesse em: https://easyreadbrazil.netlify.app

## Como funciona

1. **Biblioteca**: a tela inicial lista os livros disponíveis, com busca por título ou autor e filtro por categoria.
2. **Download para offline**: ao tocar em "Iniciar leitura", o app baixa o livro em Markdown, divide o texto em páginas de cerca de 300 palavras e grava tudo no IndexedDB do aparelho. A partir daí o livro abre sem internet.
3. **Leitura**: o leitor mostra uma página por vez, com título do capítulo, tempo estimado de leitura, ajuste do tamanho da letra e três temas (claro, rosé e escuro). Cada página avançada é registrada como lida.
4. **Revisão com IA**: o leitor escolhe um intervalo de páginas (por exemplo, da 1 à 10) e recebe um resumo daquele trecho e um quiz de múltipla escolha. Ao errar uma pergunta, o app indica a página onde está a resposta.
5. **Histórico**: as revisões e as notas dos quizzes ficam salvas no aparelho e podem ser abertas de novo, inclusive offline.

## Área do administrador

O usuário comum não precisa de conta. Apenas o administrador faz login, pelo link "Área do administrador" no rodapé. Logado, ele tem acesso a uma barra lateral para:

- adicionar livros enviando um arquivo `.md` (só Markdown é aceito);
- excluir livros do catálogo.

Os livros adicionados pelo painel aparecem na biblioteca de todos os usuários.

## Uso da IA

O resumo e o quiz são gerados pelo Gemini, do Google. Para economizar a cota gratuita da API:

- cada revisão gerada fica guardada no servidor, e quem pedir as mesmas páginas do mesmo livro recebe a revisão pronta, sem nova chamada à IA;
- existe um limite diário de revisões novas para o app inteiro e outro por pessoa;
- cada revisão precisa ter entre 3 e 50 páginas.

A chave da API fica apenas nas variáveis de ambiente do Netlify e nunca vai para o código do app.

## Tecnologias

- Vue 3, TypeScript e Vite
- vite-plugin-pwa (instalação e funcionamento offline)
- Dexie (IndexedDB) para guardar livros, páginas lidas, revisões e notas no aparelho
- Netlify (hospedagem), Netlify Functions (login do admin, catálogo e chamada à IA) e Netlify Blobs (livros do painel e cache das revisões)
- API do Gemini para gerar resumos e quizzes
- marked e DOMPurify para exibir o Markdown com segurança
- Vitest para os testes

## Como rodar o projeto

    git clone https://github.com/Helio-Junior0/easy-read.git
    cd easy-read
    npm install
    npm run dev

O `npm run dev` abre o app, mas não executa as funções do servidor (painel de admin e IA). Para testar tudo localmente:

    npx netlify login
    npx netlify link
    npx netlify dev

Outros comandos:

    npm test          # testes automatizados
    npm run build     # gera a versão de produção
    npm run preview   # abre a versão de produção (testar offline e instalação)

## Variáveis de ambiente (Netlify)

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `ADMIN_PASSWORD` | Sim | Senha do administrador (mínimo de 8 caracteres) |
| `GEMINI_API_KEY` | Sim | Chave da API do Gemini, criada no Google AI Studio |
| `GEMINI_MODEL` | Não | Modelo do Gemini (padrão: `gemini-3.5-flash-lite`) |
| `LIMITE_DIARIO` | Não | Revisões novas por dia no app inteiro (padrão: 150) |
| `LIMITE_POR_PESSOA` | Não | Revisões novas por dia por pessoa (padrão: 10) |

Depois de criar ou alterar uma variável, é preciso fazer um novo deploy.

## Fluxo de trabalho da equipe

1. Atualizar a `main`: `git checkout main` e `git pull`, depois `npm install`.
2. Criar uma branch para a tarefa: `git checkout -b feat/nome-da-tarefa`.
3. Fazer commits pequenos e enviar a branch com `git push`.
4. Abrir um pull request e conferir o Deploy Preview gerado pelo Netlify.
5. Após a revisão e o merge, apagar a branch.

A branch `main` é protegida: não aceita envio direto e exige aprovação no pull request.

Mais detalhes sobre os dados e a IA estão em `docs/dados-e-ia.md`.

## Equipe

- Helio Junior (líder)
- Helio Matheus
- Erick
- Pedro
- Alex
