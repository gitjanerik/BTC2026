<script setup>
const tabs = [
  { to: '/program',   label: 'Program', icon: '★' },
  { to: '/map',       label: 'Kart',    icon: '◎' },
  { to: '/nightlife', label: 'Natt',    icon: '☾' },
  { to: '/chat',      label: 'Chat',    icon: '✉' },
  { to: '/bingo',     label: 'Bingo',   icon: '▣' },
  { to: '/phrases',   label: 'Fraser',  icon: '♪' },
  { to: '/currency',  label: 'Valuta',  icon: '¤' },
];
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 bg-paper border-t-2 border-ink safe-bottom z-30">
    <ul class="grid grid-cols-7">
      <li v-for="t in tabs" :key="t.to">
        <router-link
          :to="t.to"
          class="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-display uppercase tracking-wide text-ink hover:bg-deep/50"
          active-class="bg-orange text-paper"
        >
          <span class="text-base leading-none" aria-hidden="true">{{ t.icon }}</span>
          <span>{{ t.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>
