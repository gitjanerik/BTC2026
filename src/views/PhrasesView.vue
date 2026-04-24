<script setup>
import { phrases } from '../data/phrases.js';
import { useTTS } from '../composables/useTTS.js';

const { hasRoVoice, speak, voicePref, setVoicePref, hasFemale, hasMale } = useTTS();
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="text-center">
      <span class="ribbon text-[10px]">Lingvistisk brigade</span>
      <h2 class="stencil text-3xl mt-2">Fraser</h2>
      <p class="text-xs opacity-70 italic">
        {{ hasRoVoice ? 'Tap høyttaler for å høre' : 'Ingen rumensk stemme funnet på enheten — fonetikk vises uansett.' }}
      </p>
    </div>

    <div v-if="hasRoVoice && (hasFemale || hasMale)" class="stamp bg-paper p-3">
      <p class="text-xs stencil mb-2 text-center">Stemme</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="stamp-sm px-2 py-2 text-sm font-display uppercase"
          :class="voicePref === 'female' ? 'bg-orange text-paper' : 'bg-paper'"
          :disabled="!hasFemale"
          @click="setVoicePref('female')"
        >♀ Kvinne</button>
        <button
          type="button"
          class="stamp-sm px-2 py-2 text-sm font-display uppercase"
          :class="voicePref === 'male' ? 'bg-orange text-paper' : 'bg-paper'"
          :disabled="!hasMale"
          @click="setVoicePref('male')"
        >♂ Mann</button>
      </div>
      <p v-if="!hasFemale || !hasMale" class="text-[10px] opacity-60 italic text-center mt-1">
        Enheten har kun én rumensk stemme — valget ignoreres hvis kjønn ikke er tilgjengelig.
      </p>
    </div>

    <ul class="space-y-2">
      <li
        v-for="(p, i) in phrases"
        :key="i"
        class="stamp-sm bg-paper p-3 flex items-center gap-3"
      >
        <div class="flex-1 min-w-0">
          <p class="text-xs stencil opacity-60">{{ p.no }}</p>
          <p class="font-display text-lg leading-tight">{{ p.ro }}</p>
          <p class="text-xs italic opacity-80">[{{ p.phon }}]</p>
        </div>
        <button
          class="stamp-sm w-11 h-11 flex items-center justify-center text-lg bg-orange text-paper disabled:opacity-40"
          :disabled="!hasRoVoice"
          :aria-label="'Spill av: ' + p.ro"
          @click="speak(p.ro)"
        >
          ▶
        </button>
      </li>
    </ul>
  </div>
</template>
