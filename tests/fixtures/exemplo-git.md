# Git na Prática

Este é um livro curto de exemplo, escrito pela equipe do Easy Read só para testar o aplicativo. Ele serve para conferir se a leitura por páginas, o resumo e o quiz funcionam. Quando os livros reais forem convertidos para Markdown, este arquivo pode ser removido do catálogo.

## O que é controle de versão

Controle de versão é a prática de registrar as mudanças feitas em arquivos ao longo do tempo, de forma que seja possível voltar a qualquer estado anterior. Sem uma ferramenta para isso, muita gente acaba criando cópias como `trabalho-final.docx`, `trabalho-final-2.docx` e `trabalho-final-agora-vai.docx`, e depois de alguns dias ninguém sabe qual é a versão certa.

Uma ferramenta de controle de versão resolve esse problema guardando um histórico organizado. Cada registro desse histórico diz o que mudou, quem mudou, quando mudou e por quê. Com isso, a equipe consegue comparar versões, descobrir quando um erro apareceu e desfazer alterações sem medo.

Existem dois modelos principais. No modelo centralizado, existe um único servidor com o histórico, e cada pessoa pega apenas a versão mais recente dos arquivos. Se o servidor cair, ninguém consegue registrar mudanças. No modelo distribuído, cada pessoa tem uma cópia completa do histórico no próprio computador. O Git segue o modelo distribuído, e por isso funciona mesmo sem internet: você registra mudanças localmente e envia para o servidor depois.

## Instalando e configurando o Git

O Git é gratuito e pode ser baixado no site oficial. Depois de instalado, o primeiro passo é dizer ao Git quem você é, porque esse nome e esse e-mail vão aparecer em cada registro que você fizer.

```bash
git config --global user.name "Seu Nome"
git config --global user.email "voce@exemplo.com"
```

A opção `--global` grava essa configuração para todos os projetos do seu usuário. Se você quiser um nome diferente em um projeto específico, basta rodar o mesmo comando sem `--global` dentro da pasta desse projeto.

Para conferir se deu certo, use:

```bash
git config --list
```

## Criando o primeiro repositório

Um repositório é uma pasta cujo histórico é controlado pelo Git. Para transformar uma pasta comum em repositório, entre nela pelo terminal e rode `git init`. O Git cria uma pasta oculta chamada `.git`, onde fica todo o histórico. Essa pasta não deve ser apagada nem editada à mão.

```bash
mkdir meu-projeto
cd meu-projeto
git init
```

Outra forma de começar é copiar um repositório que já existe, por exemplo do GitHub. Para isso usamos `git clone`, que baixa os arquivos e o histórico completo.

```bash
git clone https://github.com/usuario/projeto.git
```

## As três áreas do Git

Para entender o Git, é importante conhecer as três áreas por onde um arquivo passa.

1. **Diretório de trabalho**: são os arquivos da pasta, do jeito que você está editando agora.
2. **Área de preparação** (staging): é onde você coloca as mudanças que quer incluir no próximo registro.
3. **Repositório**: é o histórico, onde ficam os registros já confirmados.

O fluxo normal é editar arquivos no diretório de trabalho, escolher o que vai para a área de preparação com `git add` e, por fim, confirmar com `git commit`. Essa separação permite fazer várias mudanças e registrar apenas parte delas, o que deixa o histórico mais organizado.

O comando `git status` mostra em qual área cada arquivo modificado está. Ele é o comando mais usado no dia a dia, porque evita surpresas antes de cada commit.

## Fazendo commits

Um commit é um registro no histórico. Ele guarda uma "foto" dos arquivos preparados, junto com uma mensagem que explica a mudança.

```bash
git add index.html
git commit -m "Adiciona página inicial"
```

Para preparar todos os arquivos modificados de uma vez, use `git add .`, mas tome cuidado para não incluir arquivos que não deveriam ir para o histórico, como senhas ou arquivos gerados automaticamente. Para evitar isso, crie um arquivo `.gitignore` com os nomes ou padrões que o Git deve ignorar.

```text
node_modules
dist
.env
```

Boas mensagens de commit são curtas e dizem o que a mudança faz, e não o que você sentiu ao fazê-la. "Corrige cálculo do frete" é muito mais útil do que "ajustes" ou "agora funciona". Muitas equipes usam prefixos como `feat:` para funcionalidades novas e `fix:` para correções.

Para ver o histórico, use `git log`. A opção `--oneline` mostra cada commit em uma linha, o que facilita a leitura.

```bash
git log --oneline
```

## Branches

Uma branch é uma linha de desenvolvimento independente. Ela permite trabalhar em uma funcionalidade nova sem mexer na versão principal, que normalmente se chama `main`. Se o experimento der errado, basta abandonar a branch; se der certo, ela é juntada à principal.

```bash
git checkout -b feat/tela-de-login
```

O comando acima cria a branch `feat/tela-de-login` e já muda para ela. Para voltar para a principal, use `git checkout main`. Em versões mais novas do Git também existe o comando `git switch`, que faz a mesma troca de forma mais clara.

Trabalhar com branches é o que permite que várias pessoas mexam no mesmo projeto ao mesmo tempo. Cada uma cria a sua branch a partir da `main` atualizada, faz seus commits e, no final, propõe juntar o trabalho.

## Juntando branches com merge

Quando o trabalho em uma branch termina, ele é juntado à principal com `git merge`. Primeiro você vai para a branch que vai receber as mudanças e depois indica qual branch quer juntar.

```bash
git checkout main
git merge feat/tela-de-login
```

Se as duas branches mexeram em partes diferentes dos arquivos, o Git junta tudo sozinho. Se as duas mexeram na mesma linha do mesmo arquivo, acontece um conflito. O Git marca o trecho com `<<<<<<<`, `=======` e `>>>>>>>`, e cabe a você decidir qual versão fica, apagar as marcações, rodar `git add` no arquivo e concluir com `git commit`.

Conflitos assustam no começo, mas são normais. A melhor forma de evitá-los é manter as branches curtas e atualizar a sua branch com a `main` com frequência.

## Trabalhando com repositórios remotos

Um repositório remoto é uma cópia do projeto hospedada em outro lugar, como o GitHub. Ele é o ponto de encontro da equipe. Os dois comandos principais são `git push`, que envia seus commits para o remoto, e `git pull`, que traz para o seu computador os commits que outras pessoas enviaram.

```bash
git push -u origin feat/tela-de-login
git pull
```

A opção `-u` liga a branch local à branch remota, e depois disso basta digitar `git push` sem nada mais. O nome `origin` é o apelido padrão do repositório de onde o projeto foi clonado.

No GitHub, em vez de juntar a branch direto na `main`, as equipes costumam abrir um pull request. O pull request mostra as mudanças, permite que outra pessoa revise o código e só depois faz o merge. Muitos projetos bloqueiam o envio direto para a `main` justamente para obrigar esse passo de revisão.

## Desfazendo coisas

Todo mundo erra, e o Git oferece formas de desfazer. Se você modificou um arquivo e quer descartar a mudança antes de prepará-lo, use `git restore`.

```bash
git restore index.html
```

Se você já preparou o arquivo com `git add` e quer tirá-lo da área de preparação sem perder a mudança, use `git restore --staged`.

```bash
git restore --staged index.html
```

Para desfazer um commit que já foi enviado para o remoto, o caminho mais seguro é `git revert`, que cria um commit novo com o efeito contrário. Assim o histórico não é reescrito e ninguém da equipe é prejudicado. Comandos que reescrevem o histórico, como `git reset --hard` e `git push --force`, devem ser usados com muito cuidado, porque podem apagar trabalho que outras pessoas já baixaram.

## Resumo do fluxo do dia a dia

No dia a dia de uma equipe, o fluxo costuma ser sempre o mesmo:

- atualizar a `main` com `git checkout main` e `git pull`;
- criar uma branch nova para a tarefa;
- fazer as mudanças e registrar commits pequenos e bem descritos;
- enviar a branch com `git push`;
- abrir um pull request e pedir revisão;
- depois do merge, apagar a branch e voltar ao primeiro passo.

Seguir esse fluxo mantém o histórico limpo, reduz conflitos e faz com que qualquer pessoa da equipe consiga entender o que aconteceu no projeto, mesmo meses depois.
