<script setup lang="ts">
import { computed } from 'vue';
import { CircleAlert, TriangleAlert } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { agruparHallazgos } from '../../composables/saldos-iniciales/detalles-de-saldos-iniciales';
import type { HallazgoDeCierre } from '../../servicios/tipos-de-saldos-iniciales';

/**
 * «Antes de cerrar la carga»: lo que el servidor encontró. Los que pedirán un motivo al cerrar van en rojo y los
 * que solo avisan, en ámbar. Cada uno lleva a la ficha de su cuenta.
 */
const props = defineProps<{ hallazgos: HallazgoDeCierre[] }>();
const grupos = computed(() => agruparHallazgos(props.hallazgos));
const ACCIONES = [
  { clave: 'conMotivo', icono: CircleAlert, titulo: 'Piden un motivo al cerrar la carga', color: 'red' },
  { clave: 'avisos', icono: TriangleAlert, titulo: 'Solo avisan', color: 'ambar' },
] as const;
const CLASES = {
  red: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200',
  ambar:
    'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-200',
};
</script>

<template>
  <section v-if="hallazgos.length" class="mb-4 space-y-3" aria-label="Antes de cerrar la carga">
    <h2 class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">Antes de cerrar la carga</h2>
    <template v-for="tipo in ACCIONES" :key="tipo.clave">
      <div
        v-if="grupos[tipo.clave].length"
        class="rounded-lg border p-3 text-sm"
        :class="CLASES[tipo.color]"
        role="status"
      >
        <p class="flex items-center gap-2 font-medium">
          <component :is="tipo.icono" class="size-4 shrink-0" aria-hidden="true" />
          {{ tipo.titulo }} ({{ grupos[tipo.clave].length }})
        </p>
        <ul class="mt-1.5 space-y-1">
          <li v-for="hallazgo in grupos[tipo.clave]" :key="hallazgo.cuentaBancariaId + hallazgo.codigo">
            <RouterLink
              :to="{ name: 'bancos.saldos-iniciales.ficha', params: { cuentaBancariaId: hallazgo.cuentaBancariaId } }"
              class="break-words underline"
            >
              {{ hallazgo.mensaje }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
