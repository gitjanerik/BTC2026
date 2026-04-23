import { createRouter, createWebHashHistory } from 'vue-router';
import { getCurrentUser } from '../composables/useAuth.js';

const routes = [
  { path: '/', redirect: '/program' },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/program', name: 'program', component: () => import('../views/ProgramView.vue') },
  { path: '/map', name: 'map', component: () => import('../views/MapView.vue') },
  { path: '/chat', name: 'chat', component: () => import('../views/ChatView.vue') },
  { path: '/bingo', name: 'bingo', component: () => import('../views/BingoView.vue') },
  { path: '/phrases', name: 'phrases', component: () => import('../views/PhrasesView.vue') },
  { path: '/currency', name: 'currency', component: () => import('../views/CurrencyView.vue') },
  { path: '/nightlife', name: 'nightlife', component: () => import('../views/NightlifeView.vue') },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const user = getCurrentUser();
  if (to.name !== 'login' && !user) return { name: 'login' };
  if (to.name === 'login' && user) return { name: 'program' };
});

export default router;
