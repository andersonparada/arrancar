<script setup lang="ts">
import { PackageCheck } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** Pegada abajo: dice cuántas líneas hay marcadas y deja recibirlas juntas con un clic. */
defineProps<{ cantidad: number; cargando?: boolean }>();
const emit = defineEmits<{ recibir: []; quitar: [] }>();
</script>

<template>
  <div
    v-if="cantidad"
    v-permiso="'inventarios.recepciones.crear'"
    role="region"
    aria-label="Líneas marcadas para recibir"
    class="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-tierra-300 dark:bg-tierra-800 dark:ring-tierra-600"
  >
    <p class="text-sm font-medium" aria-live="polite">
      {{ cantidad === 1 ? '1 línea marcada' : `${cantidad} líneas marcadas` }}
    </p>
    <div class="flex gap-2">
      <BotonBase variante="fantasma" @click="emit('quitar')">Quitar marcas</BotonBase>
      <BotonBase :icono="PackageCheck" :cargando="cargando" @click="emit('recibir')">Recibir lo marcado</BotonBase>
    </div>
  </div>
</template>
