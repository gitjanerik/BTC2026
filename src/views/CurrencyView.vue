<script setup>
import { ref, computed, watch } from 'vue';
import { useCurrency } from '../composables/useCurrency.js';

const { rateNOK, rateEUR, updatedAt, loading, error, refresh } = useCurrency();

const ron = ref(100);
const nok = ref(0);
const eur = ref(0);
const active = ref('ron'); // siste felt som ble redigert

const rateText = computed(() => {
  if (!rateNOK.value || !rateEUR.value) return '—';
  return `1 RON = ${rateNOK.value.toFixed(3)} NOK · ${rateEUR.value.toFixed(3)} EUR`;
});
const updatedText = computed(() => (updatedAt.value ? new Date(updatedAt.value).toLocaleString('no-NO') : '—'));

function recompute() {
  const n = rateNOK.value;
  const e = rateEUR.value;
  if (!n || !e) return;
  let baseRon;
  if (active.value === 'ron') baseRon = Number(ron.value) || 0;
  else if (active.value === 'nok') baseRon = (Number(nok.value) || 0) / n;
  else baseRon = (Number(eur.value) || 0) / e;

  if (active.value !== 'ron') ron.value = Number(baseRon.toFixed(2));
  if (active.value !== 'nok') nok.value = Number((baseRon * n).toFixed(2));
  if (active.value !== 'eur') eur.value = Number((baseRon * e).toFixed(2));
}

watch(ron, () => { if (active.value === 'ron') recompute(); });
watch(nok, () => { if (active.value === 'nok') recompute(); });
watch(eur, () => { if (active.value === 'eur') recompute(); });
watch([rateNOK, rateEUR], recompute);

// initial fill
recompute();

const presets = [10, 50, 100, 200, 500];
function preset(v) {
  if (active.value === 'ron') ron.value = v;
  else if (active.value === 'nok') nok.value = v;
  else eur.value = v;
}

function setActive(which) {
  active.value = which;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="text-center">
      <span class="ribbon text-[10px]">Finans-direktoratet</span>
      <h2 class="stencil text-3xl mt-2">Valuta</h2>
      <p class="text-xs opacity-70 italic">{{ rateText }}</p>
      <p class="text-[10px] opacity-60 italic">oppdatert {{ updatedText }}</p>
    </div>

    <div class="stamp bg-paper p-4 space-y-3">
      <p class="text-[11px] opacity-70 italic text-center">Rediger i ett felt — de to andre oppdateres.</p>

      <label class="block">
        <span class="text-xs stencil">RON (lei)</span>
        <input
          v-model.number="ron"
          type="number"
          inputmode="decimal"
          class="input text-2xl font-display"
          :class="active === 'ron' ? 'bg-mustard' : ''"
          @focus="setActive('ron')"
        />
      </label>

      <label class="block">
        <span class="text-xs stencil">NOK (kroner)</span>
        <input
          v-model.number="nok"
          type="number"
          inputmode="decimal"
          class="input text-2xl font-display"
          :class="active === 'nok' ? 'bg-mustard' : ''"
          @focus="setActive('nok')"
        />
      </label>

      <label class="block">
        <span class="text-xs stencil">EUR</span>
        <input
          v-model.number="eur"
          type="number"
          inputmode="decimal"
          class="input text-2xl font-display"
          :class="active === 'eur' ? 'bg-mustard' : ''"
          @focus="setActive('eur')"
        />
      </label>

      <div class="flex flex-wrap gap-2 pt-1">
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
