<script setup>
import { ref, nextTick, watch } from 'vue';
import { useChat } from '../composables/useChat.js';
import { useAuth } from '../composables/useAuth.js';

const { messages, ready, error, send } = useChat();
const { current } = useAuth();

const draft = ref('');
const list = ref(null);
const sending = ref(false);
const sendError = ref('');

async function submit() {
  if (!draft.value.trim()) return;
  sendError.value = '';
  sending.value = true;
  try {
    await send(draft.value);
    draft.value = '';
  } catch (e) {
    sendError.value = e.message;
  } finally {
    sending.value = false;
  }
}

function fmtTime(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return '';
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

watch(messages, async () => {
  await nextTick();
  if (list.value) list.value.scrollTop = list.value.scrollHeight;
}, { deep: true, flush: 'post' });
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <div class="p-3 border-b-2 border-ink bg-deep">
      <p class="text-center">
        <span class="ribbon text-[10px]">Kanalen</span>
      </p>
      <h2 class="stencil text-2xl text-center mt-1">Chat</h2>
    </div>

    <div ref="list" class="flex-1 overflow-y-auto p-3 space-y-2">
      <p v-if="!ready" class="text-center text-sm opacity-60">Kobler til…</p>
      <p v-if="error" class="text-sovred text-sm text-center">{{ error }}</p>
      <p v-if="ready && messages.length === 0 && !error" class="text-center text-sm opacity-60">
        Ingen meldinger ennå. Si hei!
      </p>

      <div
        v-for="m in messages"
        :key="m.id"
        class="flex"
        :class="m.senderId === current?.uid ? 'justify-end' : 'justify-start'"
      >
        <div
          class="stamp-sm max-w-[80%] px-3 py-2"
          :class="m.senderId === current?.uid ? 'bg-orange text-paper' : 'bg-paper'"
        >
          <p class="text-[10px] stencil opacity-80">{{ m.senderName }} · {{ fmtTime(m.createdAt) }}</p>
          <p class="text-sm whitespace-pre-wrap leading-snug">{{ m.text }}</p>
        </div>
      </div>
    </div>

    <form class="p-3 border-t-2 border-ink bg-paper" @submit.prevent="submit">
      <p v-if="sendError" class="text-sovred text-xs mb-1">{{ sendError }}</p>
      <div class="flex gap-2">
        <input
          v-model="draft"
          type="text"
          class="input flex-1"
          placeholder="Melding til gutta…"
          :disabled="sending || !ready"
        />
        <button class="btn-primary" :disabled="sending || !ready || !draft.trim()">Send</button>
      </div>
    </form>
  </div>
</template>
