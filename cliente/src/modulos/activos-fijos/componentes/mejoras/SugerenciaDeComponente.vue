<script setup lang="ts">
import { Lightbulb } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** La sugerencia de V-3: lo que se puede separar y tiene vida propia (un motor, un techo) va como componente. */
const emit = defineEmits<{ darDeAlta: [] }>();
</script>

<template>
  <div
    role="note"
    class="flex gap-3 rounded-xl bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-tierra-100"
  >
    <Lightbulb class="mt-0.5 size-5 shrink-0 text-tierra-700 dark:text-trigo-300" aria-hidden="true" />
    <div class="space-y-2">
      <p>
        Lo que se puede separar del activo y tiene su propia vida (un motor, un techo) conviene darlo de alta como
        <strong>componente</strong>: se deprecia con su propia vida útil y se puede dar de baja aparte. Si lo registra
        como mejora, se suma al costo del activo y se deprecia con él.
      </p>
      <BotonBase v-permiso="'activos-fijos.activos.crear'" variante="secundario" pequeno @click="emit('darDeAlta')">
        Darlo de alta como componente
      </BotonBase>
    </div>
  </div>
</template>
