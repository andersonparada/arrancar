<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRight } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { opcionesDeNombres } from '../composables/fondos/opciones-de-fondos';
import type { FondoResumen } from '../servicios/tipos-de-fondos';

/** La barra fija de la bandeja: a qué fondo van los documentos marcados y el botón de asignarlos. */
const props = defineProps<{ cantidad: number; fondos: readonly FondoResumen[] }>();
const fondoId = defineModel<string | null>('fondoId', { required: true });
const emit = defineEmits<{ asignar: []; limpiar: [] }>();

const opciones = computed(() =>
  opcionesDeNombres(
    props.fondos.map((f) => ({ id: f.id, nombre: f.nombre })),
    'Elija el fondo',
  ),
);
const faltaElFondo = computed(() => props.cantidad > 0 && !fondoId.value);
</script>

<template>
  <div
    class="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-tierra-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-2xl sm:border dark:border-tierra-700 dark:bg-tierra-900/95"
    role="region"
    aria-label="Asignar los documentos marcados"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <p class="text-sm sm:flex-1" aria-live="polite">
        <template v-if="cantidad === 0">Marque los documentos que va a pagar del fondo.</template>
        <template v-else>
          <strong>{{ cantidad === 1 ? '1 documento marcado' : `${cantidad} documentos marcados` }}</strong>
          <span v-if="faltaElFondo" class="text-tierra-600 dark:text-tierra-300">
            · elija el fondo para asignarlos.</span
          >
        </template>
      </p>
      <div class="sm:w-72">
        <CampoSelector v-model="fondoId" etiqueta="Asignar al fondo" :opciones="opciones" />
      </div>
      <div class="flex gap-2">
        <BotonBase v-if="cantidad > 0" variante="fantasma" @click="emit('limpiar')">Limpiar</BotonBase>
        <BotonBase :deshabilitado="cantidad === 0 || !fondoId" :icono="ArrowRight" @click="emit('asignar')">
          Asignar
        </BotonBase>
      </div>
    </div>
  </div>
</template>
