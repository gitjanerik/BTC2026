<script setup>
import { ref, onMounted } from 'vue';
import {
  useGuideBroadcast,
  ensureNotificationPermission,
  showNotification,
} from '../composables/useGuideBroadcast.js';
import GuideComposer from './GuideComposer.vue';
import { useAuth } from '../composables/useAuth.js';

const { isGuide } = useAuth();
const toast = ref(null);

const { messages } = useGuideBroadcast((m) => {
  toast.value = m;
  const ok = showNotification('Guide-melding fra Tor Martin', m.text);
  if (!ok) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880; gain.gain.value = 0.08;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 180);
    } catch {}
  }
  setTimeout(() => { if (toast.value?.id === m.id) toast.value = null; }, 8000);
});

onMounted(() => { ensureNotificationPermission(); });
</script>

<template>
  <GuideComposer v-if="isGuide" />
  <transition
    enter-active-class="transition duration-200"
    enter-from-class="opacity-0 -translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-4"
  >
    <div
      v-if="toast"
      class="fixed top-2 inset-x-2 z-40 stamp bg-sovred text-paper p-3"
      role="alert"
      @click="toast = null"
    >
      <p class="text-[10px] stencil opacity-80">Broadcast · {{ toast.senderName }}</p>
      <p class="font-display leading-snug">{{ toast.text }}</p>
    </div>
  </transition>
</template>
