import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contarPalavras, paginar, PALAVRAS_POR_PAGINA } from '../src/services/paginacao'

const palavras = (n: number, p = 'palavra') => Array.from({ length: n }, () => p).join(' ')

describe('paginar', () => {
  it('é determinística', () => {
    const md = readFileSync('tests/fixtures/exemplo-git.md', 'utf8')
    expect(paginar(md)).toEqual(paginar(md))
  })

  it('não perde nem inventa texto', () => {
    const md = readFileSync('tests/fixtures/exemplo-git.md', 'utf8')
    const total = contarPalavras(md)
    const somaPaginas = paginar(md).reduce((s, p) => s + contarPalavras(p), 0)
    expect(somaPaginas).toBe(total)
  })

  it('mantém as páginas perto do tamanho alvo', () => {
    const md = Array.from({ length: 40 }, () => palavras(60) + '.').join('\n\n')
    const paginas = paginar(md)
    expect(paginas.length).toBeGreaterThan(5)
    for (const p of paginas) expect(contarPalavras(p)).toBeLessThanOrEqual(PALAVRAS_POR_PAGINA)
  })

  it('nunca corta bloco de código', () => {
    const codigo = '```js\n' + Array.from({ length: 200 }, (_, i) => `const a${i} = ${i}`).join('\n\n') + '\n```'
    const md = palavras(250) + '.\n\n' + codigo + '\n\n' + palavras(50) + '.'
    for (const p of paginar(md)) {
      const cercas = (p.match(/^```/gm) ?? []).length
      expect(cercas % 2).toBe(0)
    }
  })

  it('título não fica sozinho no fim da página', () => {
    const md = palavras(280) + '.\n\n### Seção\n\n' + palavras(100) + '.'
    for (const p of paginar(md)) expect(p.trim().endsWith('### Seção')).toBe(false)
  })

  it('capítulo novo (##) começa página quando a atual já tem conteúdo', () => {
    const md = palavras(200) + '.\n\n## Capítulo 2\n\n' + palavras(50) + '.'
    const paginas = paginar(md)
    expect(paginas).toHaveLength(2)
    expect(paginas[1].startsWith('## Capítulo 2')).toBe(true)
  })

  it('capítulo (#) sempre começa página nova', () => {
    const md = palavras(20) + '.\n\n# Capítulo 2\n\n' + palavras(50) + '.'
    const paginas = paginar(md)
    expect(paginas).toHaveLength(2)
    expect(paginas[1].startsWith('# Capítulo 2')).toBe(true)
  })

  it('divide parágrafo gigante entre frases', () => {
    const md = Array.from({ length: 100 }, () => palavras(9) + '.').join(' ')
    const paginas = paginar(md)
    expect(paginas.length).toBeGreaterThan(2)
    for (const p of paginas) expect(p.trim().endsWith('.')).toBe(true)
  })

  it('texto vazio gera zero páginas', () => {
    expect(paginar('   \n\n  ')).toEqual([])
  })
})
