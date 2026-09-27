<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { WifiOff } from 'lucide-vue-next';

const enLinea = ref(navigator.onLine);
const actualizar = () => (enLinea.value = navigator.onLine);

onMounted(() => {
  window.addEventListener('online', actualizar);
  window.addEventListener('offline', actualizar);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', actualizar);
  window.removeEventListener('offline', actualizar);
});
</script>

<template>
  <div
    v-if="!enLinea"
    role="status"
    class="flex items-center justify-center gap-2 bg-trigo-400 px-4 py-2 text-sm font-medium text-tierra-900"
  >
    <WifiOff class="size-4" aria-hidden="true" />
    Sin conexión a internet. Arrancar necesita conexión para guardar y consultar datos.
  </div>
</template>
