import { createRouter, createWebHistory } from 'vue-router'
import { adminLogado } from '../services/adminService'
import { carregarSessao } from '../services/contaService'

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
      path: '/entrar',
      name: 'entrar',
      component: () => import('../views/conta/EntrarView.vue'),
      meta: { publica: true, telaDeConta: true },
    },
    {
      path: '/cadastro',
      name: 'cadastro',
      component: () => import('../views/conta/CadastroView.vue'),
      meta: { publica: true, telaDeConta: true },
    },
    {
      path: '/planos',
      name: 'planos',
      component: () => import('../views/conta/PlanosView.vue'),
    },
    {
      path: '/admin',
      redirect: '/admin/livros',
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/LoginView.vue'),
      meta: { publica: true },
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
      meta: { publica: true },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

// Telas de administração só abrem para quem fez login como admin.
// A proteção de verdade é no servidor: sem o token, as funções recusam adicionar ou excluir.
router.beforeEach(async (para) => {
  const admin = adminLogado()

  if (para.meta.somenteAdmin && !admin) {
    return { name: 'admin-login', query: { voltar: para.fullPath } }
  }
  if (para.name === 'admin-login' && admin) {
    return { name: 'admin-livros' }
  }

  // Login obrigatório para usar o app (o admin logado também pode navegar)
  const usuario = await carregarSessao()
  if (!para.meta.publica && !usuario && !admin) {
    return { name: 'entrar', query: para.fullPath === '/' ? {} : { voltar: para.fullPath } }
  }
  // Quem já entrou não precisa ver as telas de entrar e cadastro
  if (para.meta.telaDeConta && usuario) {
    return '/'
  }
  return true
})

export default router
