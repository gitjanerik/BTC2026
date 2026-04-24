<script setup>
import { ref, computed, nextTick, watch, onUnmounted, onMounted } from 'vue';
import { useChat, MAX_LEN } from '../composables/useChat.js';
import { useAuth } from '../composables/useAuth.js';
import { useUnread } from '../composables/useUnread.js';

const {
  messages, ready, error, send,
  typingOthers, notifyTyping, stopTyping,
  reactions, toggleReaction,
  editMessage, deleteMessage,
} = useChat();
const { current } = useAuth();
const { markChatSeen } = useUnread();

const draft = ref('');
const list = ref(null);
const textarea = ref(null);
const sending = ref(false);
const sendError = ref('');
const editingId = ref(null);
const editDraft = ref('');
const editError = ref('');
const editSaving = ref(false);
const menuFor = ref(null);
const replyingTo = ref(null);

const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮'];
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

let idleTimer = null;

function onInput() {
  autoGrow();
  if (!draft.value.trim()) {
    stopTyping();
    return;
  }
  notifyTyping();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => stopTyping(), 3500);
}

function autoGrow() {
  const el = textarea.value;
  if (!el) return;
  el.style.height = 'auto';
  const max = Math.round(window.innerHeight * 0.4);
  el.style.height = Math.min(el.scrollHeight, max) + 'px';
}

async function submit() {
  if (!draft.value.trim()) return;
  sendError.value = '';
  sending.value = true;
  try {
    await send(draft.value, replyingTo.value);
    draft.value = '';
    replyingTo.value = null;
    await nextTick();
    autoGrow();
  } catch (e) {
    sendError.value = e.message;
  } finally {
    sending.value = false;
  }
}

function startReply(m) {
  replyingTo.value = {
    id: m.id,
    text: m.text,
    senderName: m.senderName,
    createdAt: m.createdAt,
  };
  nextTick(() => {
    textarea.value?.focus();
  });
}

function cancelReply() {
  replyingTo.value = null;
}

function oneLine(text) {
  if (!text) return '';
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > 140 ? s.slice(0, 140) + '…' : s;
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}

function startEdit(m) {
  menuFor.value = null;
  editingId.value = m.id;
  editDraft.value = (m.text || '').slice(0, MAX_LEN);
  editError.value = '';
  nextTick(() => {
    const el = document.getElementById('edit-' + m.id);
    if (el) {
      el.focus();
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.4)) + 'px';
    }
  });
}

function cancelEdit() {
  editingId.value = null;
  editDraft.value = '';
  editError.value = '';
}

async function saveEdit(m) {
  const clean = editDraft.value.trim();
  if (!clean) {
    editError.value = 'Melding kan ikke være tom';
    return;
  }
  editError.value = '';
  editSaving.value = true;
  try {
    await editMessage(m.id, clean);
    editingId.value = null;
    editDraft.value = '';
  } catch (e) {
    editError.value = e.message || 'Klarte ikke lagre';
  } finally {
    editSaving.value = false;
  }
}

function editGrow(e) {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.4)) + 'px';
}

async function remove(m) {
  menuFor.value = null;
  if (!confirm('Slette meldingen?')) return;
  try {
    await deleteMessage(m.id);
  } catch (e) {
    sendError.value = e.message;
  }
}

function fmtTime(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return '';
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

function renderText(text) {
  if (!text) return [];
  const parts = [];
  let lastIndex = 0;
  text.replace(URL_RE, (match, _url, offset) => {
    if (offset > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, offset) });
    const href = match.startsWith('http') ? match : `https://${match}`;
    parts.push({ type: 'url', value: match, href });
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  return parts;
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
  menuFor.value = null;
  try { await toggleReaction(msgId, emoji); } catch (e) { sendError.value = e.message; }
}

let pressTimer = null;
let pressStart = null;

function startPress(m, e) {
  if (editingId.value === m.id) return;
  pressStart = { x: e.clientX, y: e.clientY };
  pressTimer = setTimeout(() => {
    pressTimer = null;
    menuFor.value = m.id;
    if (navigator.vibrate) navigator.vibrate(20);
  }, 450);
}

function movePress(e) {
  if (!pressStart || !pressTimer) return;
  const dx = e.clientX - pressStart.x;
  const dy = e.clientY - pressStart.y;
  if (dx * dx + dy * dy > 100) cancelPress();
}

function cancelPress() {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
  pressStart = null;
}

function openMenu(m) {
  menuFor.value = menuFor.value === m.id ? null : m.id;
}

function doReply(m) {
  menuFor.value = null;
  startReply(m);
}

function doEdit(m) {
  startEdit(m);
}

async function doDelete(m) {
  await remove(m);
}

function scrollToBottom() {
  if (list.value) list.value.scrollTop = list.value.scrollHeight;
}

watch(messages, async () => {
  await nextTick();
  scrollToBottom();
  markChatSeen();
}, { deep: true, flush: 'post' });

watch(typingOthers, async () => {
  await nextTick();
  scrollToBottom();
}, { deep: true, flush: 'post' });

onMounted(async () => {
  await nextTick();
  scrollToBottom();
  markChatSeen();
  autoGrow();
});

onUnmounted(() => {
  if (idleTimer) clearTimeout(idleTimer);
  markChatSeen();
});
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
            class="stamp-sm px-3 py-2 break-words chat-bubble"
            :class="m.senderId === current?.uid ? 'bg-orange text-paper' : 'bg-paper'"
            style="overflow-wrap: anywhere; word-break: break-word;"
            @pointerdown="startPress(m, $event)"
            @pointermove="movePress"
            @pointerup="cancelPress"
            @pointerleave="cancelPress"
            @pointercancel="cancelPress"
            @contextmenu.prevent
          >
            <div
              v-if="m.replyTo"
              class="chat-quote mb-1 px-2 py-1 text-[11px]"
              :class="m.senderId === current?.uid ? 'bg-paper/25' : 'bg-deep/60'"
            >
              <p class="truncate leading-tight">{{ oneLine(m.replyTo.text) }}</p>
              <p class="text-[9px] stencil opacity-80 mt-0.5">
                {{ m.replyTo.senderName }}<span v-if="m.replyTo.createdAt"> · {{ fmtTime(m.replyTo.createdAt) }}</span>
              </p>
            </div>
            <p class="text-[10px] stencil opacity-80">
              {{ m.senderName }} · {{ fmtTime(m.createdAt) }}
              <span v-if="m.editedAt" class="italic opacity-70">· redigert</span>
            </p>

            <template v-if="editingId === m.id">
              <textarea
                :id="'edit-' + m.id"
                v-model="editDraft"
                :maxlength="MAX_LEN"
                class="w-full mt-1 input bg-paper text-ink text-sm resize-none"
                rows="1"
                @input="editGrow"
                @keydown.enter.exact.prevent="saveEdit(m)"
                @keydown.escape="cancelEdit"
              />
              <p v-if="editError" class="text-sovred text-[11px] mt-1">{{ editError }}</p>
              <div class="flex items-center gap-2 mt-1 justify-end">
                <span class="text-[10px] opacity-70 font-display">{{ editDraft.length }}/{{ MAX_LEN }}</span>
                <button
                  type="button"
                  class="stamp-sm px-2 py-0.5 text-[10px] font-display uppercase bg-paper text-ink"
                  @mousedown.prevent
                  @click.stop="cancelEdit"
                >Avbryt</button>
                <button
                  type="button"
                  class="stamp-sm px-2 py-0.5 text-[10px] font-display uppercase bg-forest text-paper"
                  :disabled="editSaving || !editDraft.trim()"
                  @mousedown.prevent
                  @click.stop="saveEdit(m)"
                >{{ editSaving ? 'Lagrer…' : 'Lagre' }}</button>
              </div>
            </template>

            <div v-else class="chat-bubble-text text-sm whitespace-pre-wrap leading-snug">
              <template v-for="(part, i) in renderText(m.text)" :key="i">
                <a
                  v-if="part.type === 'url'"
                  :href="part.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="chat-link"
                >{{ part.value }}</a>
                <template v-else>{{ part.value }}</template>
              </template>
            </div>
          </div>

          <button
            v-if="editingId !== m.id"
            type="button"
            class="chat-menu-trigger absolute top-0.5 right-1 text-base leading-none px-1"
            :class="m.senderId === current?.uid ? 'text-paper' : 'text-ink'"
            :aria-label="'Åpne meldingsmeny'"
            @click.stop="openMenu(m)"
          >⋮</button>

          <div
            v-if="menuFor === m.id"
            class="absolute z-20 top-full mt-1 stamp bg-paper min-w-[250px] max-w-[90vw]"
            :class="m.senderId === current?.uid ? 'right-0' : 'left-0'"
          >
            <div class="flex gap-0.5 p-1 border-b-2 border-ink/30 justify-between">
              <button
                v-for="e in EMOJIS"
                :key="e"
                type="button"
                class="w-9 h-9 text-xl flex items-center justify-center rounded hover:bg-deep active:scale-95"
                :class="myEmoji(m.id) === e ? 'bg-mustard' : ''"
                @click="pick(m.id, e)"
              >{{ e }}</button>
            </div>
            <div class="flex flex-col">
              <button
                v-if="m.senderId !== current?.uid"
                type="button"
                class="px-3 py-2 text-left text-xs font-display uppercase hover:bg-deep/50 flex items-center gap-2"
                @click="doReply(m)"
              ><span aria-hidden="true">↩</span> Svar</button>
              <template v-if="m.senderId === current?.uid">
                <button
                  type="button"
                  class="px-3 py-2 text-left text-xs font-display uppercase hover:bg-deep/50 flex items-center gap-2"
                  @click="doEdit(m)"
                ><span aria-hidden="true">✎</span> Rediger</button>
                <button
                  type="button"
                  class="px-3 py-2 text-left text-xs font-display uppercase text-sovred hover:bg-deep/50 flex items-center gap-2"
                  @click="doDelete(m)"
                ><span aria-hidden="true">🗑</span> Slett</button>
              </template>
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
      <div v-if="replyingTo" class="flex items-start gap-2 mb-2 stamp-sm bg-deep/60 px-2 py-1">
        <div class="flex-1 min-w-0">
          <p class="text-[9px] stencil opacity-80">Svarer til {{ replyingTo.senderName }}</p>
          <p class="text-[11px] truncate leading-tight">{{ oneLine(replyingTo.text) }}</p>
        </div>
        <button
          type="button"
          class="text-lg leading-none px-1 opacity-70 hover:opacity-100"
          :aria-label="'Avbryt svar'"
          @click="cancelReply"
        >×</button>
      </div>
      <p v-if="sendError" class="text-sovred text-xs mb-1">{{ sendError }}</p>
      <div class="flex gap-2 items-end">
        <textarea
          ref="textarea"
          v-model="draft"
          :maxlength="MAX_LEN"
          rows="1"
          class="input flex-1 resize-none chat-textarea"
          placeholder="Melding til gutta…"
          :disabled="sending || !ready"
          @input="onInput"
          @keydown="onKeydown"
          @blur="stopTyping"
        />
        <button class="btn-primary" :disabled="sending || !ready || !draft.trim()">Send</button>
      </div>
      <p class="text-[10px] opacity-60 text-right font-display mt-1">{{ draft.length }}/{{ MAX_LEN }}</p>
    </form>

    <div
      v-if="menuFor"
      class="fixed inset-0 z-10"
      @click="menuFor = null"
    />
  </div>
</template>

<style scoped>
.chat-textarea {
  max-height: 40vh;
  min-height: 2.5rem;
  overflow-y: auto;
  line-height: 1.3;
}
.chat-bubble-text {
  max-height: calc(1.375em * 6);
  overflow-y: auto;
}
.chat-quote {
  border-left: 3px solid #2a1810;
}
.chat-bubble {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  padding-right: 1.5rem;
}
.chat-bubble a,
.chat-bubble textarea,
.chat-bubble input {
  -webkit-user-select: text;
  user-select: text;
}
.chat-menu-trigger {
  opacity: 0.35;
  transition: opacity 0.15s;
}
.chat-menu-trigger:hover,
.chat-menu-trigger:active {
  opacity: 0.85;
}
.chat-link {
  color: #1d4ed8;
  text-decoration: underline;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.bg-orange .chat-link {
  color: #cfe0ff;
}
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
