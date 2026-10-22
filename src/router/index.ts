import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/capitulo/:id',
      name: 'capitulo',
      component: () => import('../views/CapituloView.vue'),
      props: true,
    },
    {
      path: '/capitulo/:id/quiz',
      name: 'quiz',
      component: () => import('../views/QuizView.vue'),
      props: true,
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

export default router
