<script setup>
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUnread } from '../composables/useUnread.js';

const { unreadChat, unreadBingo } = useUnread();

const tabs = computed(() => [
  { to: '/program',   label: 'Program', icon: '★' },
  { to: '/map',       label: 'Kart',    icon: '◎' },
  { to: '/weather',   label: 'Vær',     icon: '☀' },
  { to: '/chat',      label: 'Chat',    icon: '✉', badge: unreadChat.value },
  { to: '/bingo',     label: 'Bingo',   icon: '▣', badge: unreadBingo.value },
  { to: '/phrases',   label: 'Fraser',  icon: '♪' },
  { to: '/currency',  label: 'Valuta',  icon: '¤' },
  { to: '/casino',    label: 'Casino',  icon: '♠' },
  { to: '/nightlife', label: 'Natt',    icon: '☾' },
]);

const nav = ref(null);
const route = useRoute();

async function scrollActiveIntoView() {
  await nextTick();
  const active = nav.value?.querySelector('[data-active="true"]');
  if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

watch(() => route.path, scrollActiveIntoView);
onMounted(scrollActiveIntoView);
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 bg-paper border-t-2 border-ink safe-bottom z-30">
    <ul ref="nav" class="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
      <li v-for="t in tabs" :key="t.to" class="snap-start flex-shrink-0 w-[72px]">
        <router-link
          :to="t.to"
          :data-active="route.path === t.to ? 'true' : 'false'"
          class="relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-display uppercase tracking-wide text-ink hover:bg-deep/50"
          active-class="bg-orange text-paper"
        >
          <span class="relative text-base leading-none" aria-hidden="true">
            {{ t.icon }}
            <span
              v-if="t.badge"
              class="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-sovred text-paper text-[9px] font-display leading-[16px] text-center border border-ink"
            >{{ t.badge }}</span>
          </span>
          <span>{{ t.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
</style>
