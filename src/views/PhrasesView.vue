<script setup>
import { ref, computed } from 'vue';
import { phrases } from '../data/phrases.js';
import { useTTS } from '../composables/useTTS.js';
import { useVoiceRecorder } from '../composables/useVoiceRecorder.js';
import { usePhraseRecordings } from '../composables/usePhraseRecordings.js';
import { useAuth } from '../composables/useAuth.js';

const { hasRoVoice, speak, voicePref, setVoicePref, hasFemale, hasMale } = useTTS();
const { current } = useAuth();
const { listFor, myFor, save, remove } = usePhraseRecordings();
const recorder = useVoiceRecorder();

const recordingFor = ref(null); // phraseId currently being recorded/previewed
const busy = ref(false);
const busyMsg = ref('');
const lastError = ref('');
const playingUrl = ref(null); // tracks current user-voice playback
let currentAudio = null;

function openRecorder(phraseId) {
  if (recordingFor.value === phraseId) return;
  recorder.reset();
  recordingFor.value = phraseId;
  lastError.value = '';
}

function closeRecorder() {
  if (recorder.recording.value) recorder.cancel();
  recorder.reset();
  recordingFor.value = null;
}

async function startRec() {
  try { await recorder.start(); }
  catch (e) { lastError.value = e.message; }
}

function stopRec() { recorder.stop(); }

function previewRec() {
  if (!recorder.lastUrl.value) return;
  stopUserPlayback();
  const a = new Audio(recorder.lastUrl.value);
  a.play().catch(() => {});
}

async function saveRec() {
  if (!recorder.lastBlob.value || !recordingFor.value) return;
  busy.value = true;
  busyMsg.value = 'Lagrer…';
  try {
    await save(recordingFor.value, recorder.lastBlob.value, recorder.lastMime.value);
    closeRecorder();
  } catch (e) {
    lastError.value = e.message;
  } finally {
    busy.value = false;
    busyMsg.value = '';
  }
}

async function deleteRec(phraseId) {
  if (!confirm('Slette din innspilling?')) return;
  busy.value = true;
  busyMsg.value = 'Sletter…';
  try { await remove(phraseId); }
  catch (e) { lastError.value = e.message; }
  finally { busy.value = false; busyMsg.value = ''; }
}

function stopUserPlayback() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
  playingUrl.value = null;
}

function playUserVoice(url) {
  stopUserPlayback();
  currentAudio = new Audio(url);
  playingUrl.value = url;
  currentAudio.onended = () => { playingUrl.value = null; currentAudio = null; };
  currentAudio.onerror = () => { playingUrl.value = null; currentAudio = null; };
  currentAudio.play().catch(() => { playingUrl.value = null; });
}

function myRec(phraseId) { return myFor(phraseId); }
function otherRecs(phraseId) {
  const u = current.value;
  return listFor(phraseId).filter((r) => r.uid !== u?.uid);
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="text-center">
      <span class="ribbon text-[10px]">Lingvistisk brigade</span>
      <h2 class="stencil text-3xl mt-2">Fraser</h2>
      <p class="text-xs opacity-70 italic">
        {{ hasRoVoice ? 'Tap ▶ for maskinstemme, 🎤 for å spille inn din egen' : 'Tap 🎤 for å spille inn — ingen rumensk maskinstemme på enheten' }}
      </p>
    </div>

    <div v-if="hasRoVoice && (hasFemale || hasMale)" class="stamp bg-paper p-3">
      <p class="text-xs stencil mb-2 text-center">Maskinstemme</p>
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

    <p v-if="lastError" class="text-sovred text-sm text-center">{{ lastError }}</p>
    <p v-if="busyMsg" class="text-xs opacity-70 italic text-center">{{ busyMsg }}</p>

    <ul class="space-y-2">
      <li
        v-for="p in phrases"
        :key="p.id"
        class="stamp-sm bg-paper p-3 space-y-2"
      >
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs stencil opacity-60">{{ p.no }}</p>
            <p class="font-display text-lg leading-tight">{{ p.ro }}</p>
            <p class="text-xs italic opacity-80">[{{ p.phon }}]</p>
          </div>
          <button
            class="stamp-sm w-11 h-11 flex items-center justify-center text-lg bg-orange text-paper disabled:opacity-40"
            :disabled="!hasRoVoice"
            :aria-label="'Maskinstemme: ' + p.ro"
            @click="speak(p.ro)"
          >▶</button>
          <button
            class="stamp-sm w-11 h-11 flex items-center justify-center text-lg bg-mustard"
            :aria-label="'Spill inn egen stemme'"
            @click="openRecorder(p.id)"
          >🎤</button>
        </div>

        <div v-if="listFor(p.id).length" class="flex flex-wrap gap-1">
          <template v-for="r in listFor(p.id)" :key="r.uid">
            <button
              type="button"
              class="stamp-sm px-2 py-1 text-xs font-display flex items-center gap-1"
              :class="r.uid === current?.uid ? 'bg-orange text-paper' : 'bg-paper'"
              @click="playUserVoice(r.audioUrl)"
            >
              <span>▶</span>
              <span class="uppercase">{{ r.byName }}</span>
              <span v-if="playingUrl === r.audioUrl" class="opacity-70 text-[9px]">…</span>
            </button>
          </template>
          <button
            v-if="myRec(p.id)"
            type="button"
            class="stamp-sm px-2 py-1 text-xs font-display uppercase bg-sovred text-paper flex items-center gap-1"
            :aria-label="'Slett min innspilling'"
            :disabled="busy"
            @click="deleteRec(p.id)"
          >🗑 Min</button>
        </div>

        <div v-if="recordingFor === p.id" class="stamp bg-deep/50 p-2 space-y-2">
          <p class="text-[11px] stencil text-center">Spill inn: <span class="opacity-70">{{ p.ro }}</span></p>

          <div v-if="!recorder.lastBlob.value" class="flex items-center gap-2 justify-center">
            <button
              v-if="!recorder.recording.value"
              type="button"
              class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-sovred text-paper"
              @click="startRec"
            >● Start</button>
            <template v-else>
              <button
                type="button"
                class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-ink text-paper"
                @click="stopRec"
              >■ Stopp</button>
              <span class="text-xs font-display">{{ recorder.seconds.value }}s / {{ recorder.maxSeconds }}s</span>
            </template>
            <button
              v-if="!recorder.recording.value"
              type="button"
              class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-paper"
              @click="closeRecorder"
            >Avbryt</button>
          </div>

          <div v-else class="flex flex-wrap items-center gap-2 justify-center">
            <button
              type="button"
              class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-paper"
              @click="previewRec"
            >▶ Preview</button>
            <button
              type="button"
              class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-mustard"
              @click="startRec"
            >🔄 Ta på nytt</button>
            <button
              type="button"
              class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-forest text-paper"
              :disabled="busy"
              @click="saveRec"
            >💾 Lagre</button>
            <button
              type="button"
              class="stamp-sm px-3 py-2 text-sm font-display uppercase bg-paper"
              :disabled="busy"
              @click="closeRecorder"
            >Avbryt</button>
          </div>

          <p v-if="recorder.error.value" class="text-sovred text-xs text-center">{{ recorder.error.value }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
