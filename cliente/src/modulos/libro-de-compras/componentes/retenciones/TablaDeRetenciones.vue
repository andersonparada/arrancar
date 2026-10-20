<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { nombreDelImpuesto } from '../../composables/retenciones/datos-de-retenciones';
import type { RetencionDelMes } from '../../servicios/retenciones.api';
import CeldaDeConstancia from './CeldaDeConstancia.vue';
import CeldaDeDocumento from './CeldaDeDocumento.vue';
import MontoDeRetencion from './MontoDeRetencion.vue';

/**
 * Las retenciones del mes: tabla en pantallas anchas y tarjetas en el celular. Con `seleccionable` cada fila lleva una
 * casilla (solo las que no están en cero ni tienen constancia); la casilla del encabezado marca las que se puedan.
 */
defineProps<{
  retenciones: RetencionDelMes[];
  titulo: string;
  seleccionable: boolean;
  marcadas: string[];
  posibles: string[];
  todas: boolean;
}>();
defineEmits<{
  alternar: [id: string];
  alternarTodas: [];
  anotar: [r: RetencionDelMes];
  quitar: [r: RetencionDelMes];
}>();
const columnas = ['Fecha', 'Documento y proveedor', 'Impuesto', 'Base', 'Retenido', 'Constancia'];
</script>

<template>
  <section :aria-label="titulo">
    <div
      class="hidden max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 md:block dark:bg-tierra-800/60 dark:ring-tierra-700"
    >
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">
          {{
            titulo
          }}
        </caption>
        <thead
          class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
        >
          <tr>
            <th v-if="seleccionable" scope="col" class="w-10 px-3 py-2 print:hidden">
              <input
                type="checkbox"
                class="size-4"
                aria-label="Marcar todas las que no tienen constancia"
                :checked="todas"
                :disabled="posibles.length === 0"
                @change="$emit('alternarTodas')"
              />
            </th>
            <th
              v-for="columna in columnas"
              :key="columna"
              scope="col"
              class="px-3 py-2 font-semibold"
              :class="columna === 'Base' || columna === 'Retenido' ? 'text-right' : ''"
            >
              {{ columna }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
          <tr
            v-for="retencion in retenciones"
            :key="retencion.id"
            class="align-top"
            :class="[
              retencion.enCero ? 'opacity-60' : '',
              marcadas.includes(retencion.id) ? 'bg-campo-50 dark:bg-campo-950/40' : '',
            ]"
          >
            <td v-if="seleccionable" class="px-3 py-2 print:hidden">
              <input
                v-if="posibles.includes(retencion.id)"
                type="checkbox"
                class="size-4"
                :aria-label="`Marcar la retención de ${retencion.proveedor.nombre}`"
                :checked="marcadas.includes(retencion.id)"
                @change="$emit('alternar', retencion.id)"
              />
            </td>
            <td class="whitespace-nowrap px-3 py-2">{{ formatearFecha(retencion.fecha) }}</td>
            <td class="min-w-56 px-3 py-2"><CeldaDeDocumento :retencion="retencion" /></td>
            <td class="whitespace-nowrap px-3 py-2">{{ nombreDelImpuesto(retencion) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(retencion.base) }}</td>
            <td class="min-w-40 px-3 py-2 text-right"><MontoDeRetencion :retencion="retencion" /></td>
            <td class="min-w-40 px-3 py-2">
              <CeldaDeConstancia
                :retencion="retencion"
                @anotar="$emit('anotar', retencion)"
                @quitar="$emit('quitar', retencion)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul class="flex flex-col gap-2 md:hidden">
      <li
        v-for="retencion in retenciones"
        :key="retencion.id"
        class="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
        :class="retencion.enCero ? 'opacity-60' : ''"
      >
        <input
          v-if="seleccionable && posibles.includes(retencion.id)"
          type="checkbox"
          class="mt-1 size-5 shrink-0"
          :aria-label="`Marcar la retención de ${retencion.proveedor.nombre}`"
          :checked="marcadas.includes(retencion.id)"
          @change="$emit('alternar', retencion.id)"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          <CeldaDeDocumento :retencion="retencion" />
          <p class="text-xs text-tierra-600 dark:text-tierra-300">
            {{ nombreDelImpuesto(retencion) }} sobre {{ formatearMonto(retencion.base) }} ·
            {{ formatearFecha(retencion.fecha) }}
          </p>
          <MontoDeRetencion :retencion="retencion" />
          <CeldaDeConstancia
            :retencion="retencion"
            @anotar="$emit('anotar', retencion)"
            @quitar="$emit('quitar', retencion)"
          />
        </div>
      </li>
    </ul>
  </section>
</template>
