<script setup>
import { ref, computed, watch } from 'vue';
import { useCurrency } from '../composables/useCurrency.js';

const { rate, updatedAt, loading, error, refresh } = useCurrency();

const ron = ref(100);
const nok = ref(0);
const direction = ref('ron-to-nok');

const rateText = computed(() => (rate.value ? `1 RON = ${rate.value.toFixed(3)} NOK` : '—'));
const updatedText = computed(() => (updatedAt.value ? new Date(updatedAt.value).toLocaleString('no-NO') : '—'));

function recompute() {
  if (!rate.value) return;
  if (direction.value === 'ron-to-nok') {
    nok.value = Number((ron.value * rate.value).toFixed(2));
  } else {
    ron.value = Number((nok.value / rate.value).toFixed(2));
  }
}

watch([ron, rate], () => { if (direction.value === 'ron-to-nok') recompute(); });
watch([nok], () => { if (direction.value === 'nok-to-ron') recompute(); });
watch(direction, recompute);
watch(rate, recompute);

const presets = [10, 50, 100, 200, 500];
function preset(v) {
  if (direction.value === 'ron-to-nok') ron.value = v;
  else nok.value = v;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="text-center">
      <span class="ribbon text-[10px]">Finans-direktoratet</span>
      <h2 class="stencil text-3xl mt-2">Valuta</h2>
      <p class="text-xs opacity-70 italic">{{ rateText }} · oppdatert {{ updatedText }}</p>
    </div>

    <div class="stamp bg-paper p-4 space-y-4">
      <div class="grid grid-cols-2 gap-2">
        <button
          class="stamp-sm py-2 text-sm font-display uppercase"
          :class="direction === 'ron-to-nok' ? 'bg-orange text-paper' : 'bg-paper'"
          @click="direction = 'ron-to-nok'"
        >RON → NOK</button>
        <button
          class="stamp-sm py-2 text-sm font-display uppercase"
          :class="direction === 'nok-to-ron' ? 'bg-orange text-paper' : 'bg-paper'"
          @click="direction = 'nok-to-ron'"
        >NOK → RON</button>
      </div>

      <div v-if="direction === 'ron-to-nok'" class="space-y-3">
        <label class="block">
          <span class="text-xs stencil">RON</span>
          <input v-model.number="ron" type="number" inputmode="decimal" class="input text-2xl font-display" />
        </label>
        <div class="text-center font-display">↓</div>
        <div class="stamp-sm bg-mustard p-3 text-center">
          <span class="text-xs stencil">NOK</span>
          <p class="font-display text-3xl">{{ nok.toFixed(2) }}</p>
        </div>
      </div>

      <div v-else class="space-y-3">
        <label class="block">
          <span class="text-xs stencil">NOK</span>
          <input v-model.number="nok" type="number" inputmode="decimal" class="input text-2xl font-display" />
        </label>
        <div class="text-center font-display">↓</div>
        <div class="stamp-sm bg-mustard p-3 text-center">
          <span class="text-xs stencil">RON</span>
          <p class="font-display text-3xl">{{ ron.toFixed(2) }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in presets"
          :key="p"
          class="stamp-sm px-3 py-1 text-xs font-display uppercase bg-paper"
          @click="preset(p)"
        >{{ p }}</button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <p v-if="error" class="text-sovred text-sm">{{ error }}</p>
      <p v-else-if="loading" class="text-xs opacity-60">Henter kurs…</p>
      <span />
      <button class="stamp-sm px-3 py-1 text-xs font-display uppercase bg-paper" @click="refresh">Oppdater</button>
    </div>
  </div>
</template>
