<script setup>
import { onMounted } from 'vue';
import BottomNav from './BottomNav.vue';
import BroadcastToast from './BroadcastToast.vue';
import { useAuth } from '../composables/useAuth.js';
import { useRouter } from 'vue-router';
import { startChatNotifications } from '../composables/useChatNotifications.js';

const { current, logout } = useAuth();
const router = useRouter();

onMounted(() => {
  startChatNotifications();
});

function handleLogout() {
  logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-full flex flex-col">
    <div class="stripe-top" />
    <header class="safe-top px-4 pt-3 pb-2 border-b-2 border-ink bg-deep">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="star text-sovred text-xl flex-shrink-0" aria-hidden="true" />
          <div class="min-w-0">
            <h1 class="stencil text-lg leading-tight">BTC-gutta 2026</h1>
            <p class="text-xs opacity-70">Bucuresti · 24–27. april</p>
          </div>
        </div>
        <button
          v-if="current"
          class="stamp-sm px-2 py-1 text-xs font-display uppercase bg-paper"
          @click="handleLogout"
        >
          {{ current.name }} ↪
        </button>
      </div>
    </header>

    <main class="flex-1 min-h-0 flex flex-col pb-20">
      <slot />
    </main>

    <BottomNav />
    <BroadcastToast />
  </div>
</template>
