<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { bingoItems } from '../data/bingo.js';
import { users } from '../data/users.js';
import { useBingo } from '../composables/useBingo.js';
import { useAuth } from '../composables/useAuth.js';
import { useUnread } from '../composables/useUnread.js';

const { current } = useAuth();
const { everyones, ready, error, markDone, unmark } = useBingo();
const { markBingoSeen } = useUnread();

onMounted(() => markBingoSeen());
onUnmounted(() => markBingoSeen());
watch(everyones, () => markBingoSeen(), { deep: true });

const busyId = ref(null);
const actionError = ref('');
const preview = ref(null); // { user, item, photoUrl }

function myState(itemId) {
  if (!current.value) return null;
  return everyones.value[current.value.uid]?.[itemId] || null;
}

const scoreboard = computed(() => users.map((u) => {
  let count = 0;
  Object.values(everyones.value).forEach((map) => {
    Object.values(map).forEach((s) => { if (s.byName === u.name) count++; });
  });
  return { name: u.name, count };
}));

async function onFileChange(e, item) {
  const file = e.target.files?.[0];
  if (!file) return;
  busyId.value = item.id;
  actionError.value = '';
  try {
    await markDone(item.id, file);
  } catch (err) {
    actionError.value = err.message;
  } finally {
    busyId.value = null;
    e.target.value = '';
  }
}

async function markNoPhoto(item) {
  busyId.value = item.id;
  actionError.value = '';
  try {
    await markDone(item.id, null);
  } catch (err) { actionError.value = err.message; }
  finally { busyId.value = null; }
}

async function undo(item) {
  busyId.value = item.id;
  actionError.value = '';
  try { await unmark(item.id); }
  catch (err) { actionError.value = err.message; }
  finally { busyId.value = null; }
}

function othersPhotos(itemId) {
  const list = [];
  Object.values(everyones.value).forEach((map) => {
    const s = map?.[itemId];
    if (s?.photoUrl && s.byName !== current.value?.name) list.push(s);
  });
  return list;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="text-center">
      <span class="ribbon text-[10px]">Feltoppdrag</span>
      <h2 class="stencil text-3xl mt-2">Bucuresti Bingo</h2>
      <p class="text-xs opacity-70 italic">Ta bilde og kryss av. Hver deltaker har egen liste.</p>
    </div>

    <div class="stamp bg-paper p-3">
      <p class="text-xs stencil mb-2">Ledertavle</p>
      <ul class="grid grid-cols-5 gap-1 text-center">
        <li v-for="s in scoreboard" :key="s.name" class="stamp-sm p-1 bg-paper">
          <p class="text-[10px] font-display uppercase truncate">{{ s.name }}</p>
          <p class="font-display text-lg">{{ s.count }}</p>
        </li>
      </ul>
    </div>

    <p v-if="!ready" class="text-center text-sm opacity-60">Laster…</p>
    <p v-if="error" class="text-sovred text-sm text-center">{{ error }}</p>
    <p v-if="actionError" class="text-sovred text-sm text-center">{{ actionError }}</p>

    <ul class="grid grid-cols-2 gap-3">
      <li v-for="item in bingoItems" :key="item.id">
        <div
          class="stamp-sm p-2 h-full flex flex-col gap-2"
          :class="myState(item.id) ? 'bg-mustard' : 'bg-paper'"
        >
          <div class="relative aspect-square overflow-hidden border-2 border-ink bg-deep/40">
            <img
              v-if="myState(item.id)?.photoUrl"
              :src="myState(item.id).photoUrl"
              class="absolute inset-0 w-full h-full object-cover"
              alt=""
            />
            <div v-else class="absolute inset-0 flex items-center justify-center text-4xl opacity-40">▣</div>
            <div v-if="myState(item.id)" class="absolute top-1 right-1 bg-sovred text-paper text-xs font-display uppercase px-1.5 py-0.5">✓</div>
          </div>
          <div class="flex-1">
            <p class="font-display text-sm leading-tight">{{ item.title }}</p>
            <p v-if="item.hint" class="text-[10px] opacity-70 leading-tight mt-0.5">{{ item.hint }}</p>
          </div>
          <div class="flex gap-1">
            <label
              class="stamp-sm flex-1 text-center px-1 py-1 text-[10px] font-display uppercase cursor-pointer"
              :class="busyId === item.id ? 'opacity-50 pointer-events-none' : 'bg-paper'"
            >
              {{ myState(item.id)?.photoUrl ? 'Bytt' : 'Foto' }}
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="onFileChange($event, item)" />
            </label>
            <button
              v-if="!myState(item.id)"
              class="stamp-sm px-1 py-1 text-[10px] font-display uppercase bg-forest text-paper"
              :disabled="busyId === item.id"
              @click="markNoPhoto(item)"
            >✓</button>
            <button
              v-else
              class="stamp-sm px-1 py-1 text-[10px] font-display uppercase bg-sovred text-paper"
              :disabled="busyId === item.id"
              @click="undo(item)"
            >−</button>
          </div>
          <div v-if="othersPhotos(item.id).length" class="flex gap-1 overflow-x-auto">
            <button
              v-for="o in othersPhotos(item.id)"
              :key="o.byName"
              type="button"
              class="relative w-8 h-8 border border-ink flex-shrink-0"
              @click="preview = { byName: o.byName, title: item.title, photoUrl: o.photoUrl }"
            >
              <img :src="o.photoUrl" class="w-full h-full object-cover" :alt="o.byName" />
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div
      v-if="preview"
      class="fixed inset-0 z-40 bg-ink/80 flex items-center justify-center p-4"
      @click="preview = null"
    >
      <div class="stamp bg-paper p-2 max-w-md w-full" @click.stop>
        <img :src="preview.photoUrl" class="w-full h-auto" :alt="preview.title" />
        <p class="text-center font-display mt-2">{{ preview.title }} — {{ preview.byName }}</p>
        <button class="btn w-full mt-2" @click="preview = null">Lukk</button>
      </div>
    </div>
  </div>
</template>
