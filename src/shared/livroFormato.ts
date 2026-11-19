// Regras dos livros enviados pelo painel de admin.
// Usado pelo navegador e pelas Netlify Functions: não importar nada de Vue, Dexie ou Node aqui.

export interface DadosLivro {
  titulo: string;
  autor: string;
  descricao?: string;
  categoria?: string;
  licenca?: string;
}

export interface EnvioLivro extends DadosLivro {
  nomeArquivo: string;
  md: string;
}

// Limite do arquivo .md (as Netlify Functions aceitam até 6 MB por requisição)
export const TAMANHO_MAXIMO_MD = 4 * 1024 * 1024;

// "Pense em Python" -> "pense-em-python"
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function slugValido(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
}

// Devolve a mensagem de erro, ou null se o arquivo pode ser aceito
export function validarArquivoMd(nomeArquivo: string, conteudo: string): string | null {
  if (!/\.md$/i.test(nomeArquivo.trim())) {
    return 'O livro precisa ser um arquivo .md (Markdown).';
  }
  if (!conteudo.trim()) {
    return 'O arquivo está vazio.';
  }
  if (conteudo.includes('\u0000')) {
    return 'O arquivo não parece ser texto. Envie o livro em Markdown (.md).';
  }
  // Conta em bytes aproximados (UTF-8 usa até 4 bytes por caractere; aqui basta o tamanho do texto)
  if (conteudo.length > TAMANHO_MAXIMO_MD) {
    return 'O arquivo é grande demais (máximo de 4 MB).';
  }
  return null;
}

export function validarDadosLivro(dados: DadosLivro): string | null {
  if (!dados.titulo?.trim()) return 'Informe o título do livro.';
  if (!dados.autor?.trim()) return 'Informe o autor do livro.';
  if (dados.titulo.length > 150) return 'O título é longo demais.';
  if (dados.autor.length > 150) return 'O nome do autor é longo demais.';
  if ((dados.descricao?.length ?? 0) > 600) return 'A descrição pode ter no máximo 600 caracteres.';
  if ((dados.categoria?.length ?? 0) > 40) return 'A categoria é longa demais.';
  if ((dados.licenca?.length ?? 0) > 120) return 'A licença é longa demais.';
  if (!gerarSlug(dados.titulo)) return 'O título precisa ter letras ou números.';
  return null;
}
