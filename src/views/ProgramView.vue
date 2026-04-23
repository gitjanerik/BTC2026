<script setup>
import { ref, computed } from 'vue';
import { program } from '../data/program.js';
import DayCard from '../components/DayCard.vue';

const today = new Date().toISOString().slice(0, 10);
const defaultOpen = computed(() => {
  const active = program.find((d) => d.date === today);
  return active ? active.day : program[0].day;
});

const openDay = ref(defaultOpen.value);
function toggle(day) {
  openDay.value = openDay.value === day ? null : day;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="text-center">
      <span class="ribbon text-[10px]">Itinerar</span>
      <h2 class="stencil text-3xl mt-2">Programmet</h2>
      <p class="text-xs opacity-70 italic">Tap for å utvide. Lenker åpner Google Maps / Street View.</p>
    </div>
    <DayCard
      v-for="d in program"
      :key="d.day"
      :day="d"
      :open="openDay === d.day"
      @toggle="toggle(d.day)"
    />
  </div>
</template>
