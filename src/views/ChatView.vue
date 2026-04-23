<script setup>
import { ref, computed, nextTick, watch, onUnmounted } from 'vue';
import { useChat } from '../composables/useChat.js';
import { useAuth } from '../composables/useAuth.js';

const {
  messages, ready, error, send,
  typingOthers, notifyTyping, stopTyping,
  reactions, toggleReaction,
} = useChat();
const { current } = useAuth();

const draft = ref('');
const list = ref(null);
const sending = ref(false);
const sendError = ref('');
const pickerFor = ref(null); // msgId currently showing picker

const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮'];

let idleTimer = null;

function onInput() {
  if (!draft.value.trim()) {
    stopTyping();
    return;
  }
  notifyTyping();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => stopTyping(), 3500);
}

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

const typingLabel = computed(() => {
  const names = typingOthers.value.map((t) => t.name);
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} skriver`;
  if (names.length === 2) return `${names[0]} og ${names[1]} skriver`;
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]} skriver`;
});

function grouped(msgId) {
  const by = reactions.value[msgId];
  if (!by) return [];
  const agg = {};
  Object.entries(by).forEach(([uid, r]) => {
    if (!agg[r.emoji]) agg[r.emoji] = { emoji: r.emoji, count: 0, names: [], uids: [] };
    agg[r.emoji].count += 1;
    agg[r.emoji].names.push(r.name);
    agg[r.emoji].uids.push(uid);
  });
  return Object.values(agg).sort((a, b) => b.count - a.count);
}

function myEmoji(msgId) {
  const u = current.value?.uid;
  return u ? reactions.value[msgId]?.[u]?.emoji : null;
}

async function pick(msgId, emoji) {
  pickerFor.value = null;
  try { await toggleReaction(msgId, emoji); } catch (e) { sendError.value = e.message; }
}

watch(messages, async () => {
  await nextTick();
  if (list.value) list.value.scrollTop = list.value.scrollHeight;
}, { deep: true, flush: 'post' });

watch(typingOthers, async () => {
  await nextTick();
  if (list.value) list.value.scrollTop = list.value.scrollHeight;
}, { deep: true, flush: 'post' });

onUnmounted(() => { if (idleTimer) clearTimeout(idleTimer); });
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <div class="p-3 border-b-2 border-ink bg-deep">
      <p class="text-center">
        <span class="ribbon text-[10px]">Kanalen</span>
      </p>
      <h2 class="stencil text-2xl text-center mt-1">Chat</h2>
    </div>

    <div ref="list" class="flex-1 overflow-y-auto px-3 pt-3 pb-16 space-y-3">
      <p v-if="!ready" class="text-center text-sm opacity-60">Kobler til…</p>
      <p v-if="error" class="text-sovred text-sm text-center">{{ error }}</p>
      <p v-if="ready && messages.length === 0 && !error" class="text-center text-sm opacity-60">
        Ingen meldinger ennå. Si hei!
      </p>

      <div
        v-for="m in messages"
        :key="m.id"
        class="flex flex-col"
        :class="m.senderId === current?.uid ? 'items-end' : 'items-start'"
      >
        <div class="relative max-w-[85%] group">
          <div
            class="stamp-sm px-3 py-2"
            :class="m.senderId === current?.uid ? 'bg-orange text-paper' : 'bg-paper'"
            @dblclick="pickerFor = m.id"
          >
            <p class="text-[10px] stencil opacity-80">{{ m.senderName }} · {{ fmtTime(m.createdAt) }}</p>
            <p class="text-sm whitespace-pre-wrap leading-snug">{{ m.text }}</p>
          </div>
          <button
            type="button"
            class="absolute -top-2 -right-2 w-7 h-7 stamp-sm bg-paper flex items-center justify-center text-sm"
            :aria-label="'Reager på melding'"
            @click="pickerFor = pickerFor === m.id ? null : m.id"
          >☺</button>

          <div
            v-if="pickerFor === m.id"
            class="absolute z-10 mt-1 left-0 right-0 flex justify-center"
          >
            <div class="stamp bg-paper px-2 py-1 flex gap-1">
              <button
                v-for="e in EMOJIS"
                :key="e"
                type="button"
                class="w-9 h-9 text-xl flex items-center justify-center rounded hover:bg-deep active:scale-95"
                :class="myEmoji(m.id) === e ? 'bg-mustard' : ''"
                @click="pick(m.id, e)"
              >{{ e }}</button>
            </div>
          </div>
        </div>

        <div v-if="grouped(m.id).length" class="flex gap-1 flex-wrap mt-1 max-w-[85%]"
             :class="m.senderId === current?.uid ? 'justify-end' : 'justify-start'">
          <button
            v-for="r in grouped(m.id)"
            :key="r.emoji"
            type="button"
            class="stamp-sm px-1.5 py-0.5 text-xs flex items-center gap-1"
            :class="myEmoji(m.id) === r.emoji ? 'bg-mustard' : 'bg-paper'"
            :title="r.names.join(', ')"
            @click="pick(m.id, r.emoji)"
          >
            <span>{{ r.emoji }}</span>
            <span class="font-display">{{ r.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="typingOthers.length" class="flex justify-start">
        <div class="stamp-sm bg-paper px-3 py-2 flex items-center gap-2">
          <p class="text-[10px] stencil opacity-80">{{ typingLabel }}</p>
          <span class="typing-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
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
          @input="onInput"
          @blur="stopTyping"
        />
        <button class="btn-primary" :disabled="sending || !ready || !draft.trim()">Send</button>
      </div>
    </form>

    <div
      v-if="pickerFor"
      class="fixed inset-0 z-0"
      @click="pickerFor = null"
    />
  </div>
</template>

<style scoped>
.typing-dots {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}
.typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #2a1810;
  display: inline-block;
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-3px); opacity: 1; }
}
</style>
