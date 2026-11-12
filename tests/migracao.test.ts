import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { expect, it } from 'vitest'

it('migra o banco antigo (v3, capítulos) para o novo sem erro', async () => {
  const antigo = new Dexie('EasyReadDB')
  antigo.version(3).stores({
    livros: '++id, titulo, autor',
    capitulos: '++id, livroId, numero, titulo',
    resumos: '++id, capituloId, dataCriacao',
    quizzes: '++id, capituloId',
  })
  await antigo.open()
  await antigo.table('livros').add({ id: 1, titulo: 'Dom Casmurro', autor: 'Machado' })
  await antigo.table('capitulos').add({ id: 101, livroId: 1, numero: 1, titulo: 'x', texto: 'y' })
  antigo.close()

  const { db } = await import('../src/db/index')
  await db.open()
  expect(db.verno).toBe(5)
  expect(await db.livros.count()).toBe(0)
  expect(db.tables.map((t) => t.name).sort()).toEqual(['leituras', 'livros', 'paginas', 'revisoes', 'tentativas'])
  await db.livros.add({ slug: 'a', titulo: 'A', autor: 'B', arquivo: 'livros/a.md', totalPaginas: 1, baixadoEm: new Date() })
  expect(await db.livros.where('slug').equals('a').count()).toBe(1)
})
