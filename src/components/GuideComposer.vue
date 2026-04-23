<script setup>
import { ref } from 'vue';
import { useGuideBroadcast } from '../composables/useGuideBroadcast.js';

const { send } = useGuideBroadcast();
const open = ref(false);
const text = ref('');
const busy = ref(false);
const err = ref('');

async function submit() {
  if (!text.value.trim()) return;
  busy.value = true; err.value = '';
  try {
    await send(text.value);
    text.value = '';
    open.value = false;
  } catch (e) {
    err.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      class="fixed right-3 bottom-24 z-30 stamp bg-sovred text-paper w-14 h-14 flex items-center justify-center font-display text-2xl"
      aria-label="Broadcast"
      @click="open = true"
    >📣</button>
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-ink/70 flex items-end sm:items-center justify-center"
      @click.self="open = false"
    >
      <div class="stamp bg-paper w-full sm:max-w-md m-0 sm:m-4 p-4">
        <p class="ribbon text-[10px]">Guide broadcast</p>
        <h3 class="stencil text-xl mt-2">Send til alle</h3>
        <textarea
          v-model="text"
          class="input mt-3 h-28 resize-none"
          placeholder="Møt meg ved Athenaeum kl 18:45"
        />
        <p v-if="err" class="text-sovred text-sm mt-1">{{ err }}</p>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button class="btn" @click="open = false">Avbryt</button>
          <button class="btn-red" :disabled="busy || !text.trim()" @click="submit">
            {{ busy ? 'Sender…' : 'Broadcast' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
