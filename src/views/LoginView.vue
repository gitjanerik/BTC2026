<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { users } from '../data/users.js';
import { useAuth } from '../composables/useAuth.js';

const router = useRouter();
const { login } = useAuth();

const selected = ref(null);
const pin = ref('');
const error = ref('');
const loading = ref(false);

const user = computed(() => users.find((u) => u.id === selected.value));

async function submit() {
  if (!selected.value) { error.value = 'Velg navn først'; return; }
  if (!pin.value) { error.value = 'Skriv inn PIN'; return; }
  error.value = '';
  loading.value = true;
  try {
    await login(selected.value, pin.value);
    router.push({ name: 'program' });
  } catch (e) {
    error.value = e.message || 'Innlogging feilet';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col">
    <div class="stripe-top" />
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <p class="ribbon text-xs">CCCP · BTC · 2026</p>
          <h1 class="stencil text-4xl mt-3 leading-tight">BTC-gutta</h1>
          <p class="font-display text-2xl text-sovred -mt-1">2026</p>
          <p class="mt-2 text-sm opacity-80 italic">Bucuresti 24.–27. april</p>
        </div>

        <div class="stamp p-5 space-y-4 bg-paper">
          <div>
            <label class="block text-xs stencil mb-2">Hvem er du?</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="u in users"
                :key="u.id"
                type="button"
                class="stamp-sm px-2 py-2 text-sm font-display uppercase"
                :class="selected === u.id
                  ? (u.isGuide ? 'bg-sovred text-paper' : 'bg-orange text-paper')
                  : 'bg-paper'"
                @click="selected = u.id; error = ''"
              >
                {{ u.name }}<span v-if="u.isGuide" class="ml-1">★</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs stencil mb-2">
              PIN {{ user?.isGuide ? '(guide)' : '' }}
            </label>
            <input
              v-model="pin"
              type="password"
              inputmode="numeric"
              autocomplete="off"
              class="input text-center tracking-[0.4em] text-lg"
              placeholder="••••"
              @keyup.enter="submit"
            />
          </div>

          <p v-if="error" class="text-sovred text-sm font-display uppercase text-center">{{ error }}</p>

          <button class="btn-primary w-full" :disabled="loading" @click="submit">
            {{ loading ? 'Sjekker…' : 'Logg inn' }}
          </button>

          <p class="text-[10px] opacity-60 text-center leading-tight">
            PIN-en hindrer utilsiktet adgang — ikke reell sikkerhet. Ikke del sensitive data i chat.
          </p>
        </div>
      </div>
    </div>
    <div class="stripe-top" />
  </div>
</template>
