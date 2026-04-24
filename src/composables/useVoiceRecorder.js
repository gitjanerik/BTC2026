import { ref } from 'vue';

const MAX_MS = 15000;

function pickMime() {
  const prefs = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of prefs) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function useVoiceRecorder() {
  const recording = ref(false);
  const seconds = ref(0);
  const lastBlob = ref(null);
  const lastMime = ref('');
  const lastUrl = ref(null);
  const error = ref('');

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let tickTimer = null;
  let autoStop = null;
  let startedAt = 0;

  function cleanup() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (autoStop) { clearTimeout(autoStop); autoStop = null; }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    mediaRecorder = null;
  }

  function revoke() {
    if (lastUrl.value) {
      try { URL.revokeObjectURL(lastUrl.value); } catch {}
      lastUrl.value = null;
    }
  }

  async function start() {
    error.value = '';
    revoke();
    lastBlob.value = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Opptak støttes ikke på denne enheten';
      throw new Error(error.value);
    }
    if (typeof MediaRecorder === 'undefined') {
      error.value = 'MediaRecorder ikke tilgjengelig';
      throw new Error(error.value);
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      error.value = e.message || 'Kunne ikke få tilgang til mikrofon';
      throw e;
    }
    const mime = pickMime();
    chunks = [];
    mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    lastMime.value = mediaRecorder.mimeType || mime || 'audio/webm';
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: lastMime.value });
      lastBlob.value = blob;
      revoke();
      lastUrl.value = URL.createObjectURL(blob);
      recording.value = false;
      cleanup();
    };
    mediaRecorder.start();
    startedAt = Date.now();
    recording.value = true;
    seconds.value = 0;
    tickTimer = setInterval(() => {
      seconds.value = Math.min(MAX_MS / 1000, Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    autoStop = setTimeout(() => stop(), MAX_MS);
  }

  function stop() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanup();
      recording.value = false;
      return;
    }
    try { mediaRecorder.stop(); } catch {}
  }

  function cancel() {
    stop();
    lastBlob.value = null;
    revoke();
    seconds.value = 0;
  }

  function reset() {
    revoke();
    lastBlob.value = null;
    lastMime.value = '';
    seconds.value = 0;
    error.value = '';
  }

  return {
    recording, seconds, lastBlob, lastMime, lastUrl, error,
    maxSeconds: MAX_MS / 1000,
    start, stop, cancel, reset,
  };
}
