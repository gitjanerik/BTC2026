<script setup>
import StopCard from './StopCard.vue';

defineProps({
  day: { type: Object, required: true },
  open: { type: Boolean, default: false },
});
defineEmits(['toggle']);
</script>

<template>
  <section class="stamp bg-paper">
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      @click="$emit('toggle')"
    >
      <div>
        <p class="text-[10px] stencil opacity-60">{{ day.date }}</p>
        <h2 class="font-display text-xl uppercase leading-tight">{{ day.label }}</h2>
      </div>
      <span class="font-display text-2xl">{{ open ? '−' : '+' }}</span>
    </button>
    <div v-if="open" class="border-t-2 border-ink p-3 space-y-3 bg-deep/40">
      <StopCard v-for="s in day.stops" :key="s.id" :stop="s" />
    </div>
  </section>
</template>
