import { createRouter, createWebHistory } from 'vue-router'
import { adminLogado } from '../services/adminService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/livro/:id',
      name: 'livro',
      component: () => import('../views/LivroView.vue'),
      props: true,
    },
    {
      path: '/livro/:id/pagina/:n',
      name: 'leitor',
      component: () => import('../views/LeitorView.vue'),
      props: true,
    },
    {
      path: '/livro/:id/revisao',
      name: 'revisao',
      component: () => import('../views/RevisaoView.vue'),
      props: true,
    },
    {
      path: '/admin',
      redirect: '/admin/livros',
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/LoginView.vue'),
    },
    {
      path: '/admin/livros',
      name: 'admin-livros',
      component: () => import('../views/admin/LivrosAdminView.vue'),
      meta: { somenteAdmin: true },
    },
    {
      path: '/admin/livros/novo',
      name: 'admin-novo-livro',
      component: () => import('../views/admin/NovoLivroView.vue'),
      meta: { somenteAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'nao-encontrado',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

// Telas de administração só abrem para quem fez login como admin.
// A proteção de verdade é no servidor: sem o token, as funções recusam adicionar ou excluir.
router.beforeEach((para) => {
  if (para.meta.somenteAdmin && !adminLogado()) {
    return { name: 'admin-login', query: { voltar: para.fullPath } }
  }
  if (para.name === 'admin-login' && adminLogado()) {
    return { name: 'admin-livros' }
  }
  return true
})

export default router
