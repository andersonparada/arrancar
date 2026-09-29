<script setup lang="ts">
import type { ChequeCaduco } from '../../servicios/cheques-caducos.api';
import FilaDeChequeCaduco from './FilaDeChequeCaduco.vue';

/**
 * La tabla del reporte; en el celular se desliza dentro de su tarjeta, sin mover la página. Con `seleccionable`
 * lleva una casilla por fila y una para marcar todo lo filtrado (la anulación en lote).
 */
defineProps<{ cheques: ChequeCaduco[]; seleccionable: boolean; seleccion: string[]; todosMarcados: boolean }>();
const emit = defineEmits<{ marcar: [chequeId: string, marcado: boolean]; marcarTodos: [marcado: boolean] }>();
const alMarcarTodos = (evento: Event): void => emit('marcarTodos', (evento.target as HTMLInputElement).checked);
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[54rem] text-left text-sm">
      <caption class="sr-only">
        Cheques emitidos y sin cobrar que ya pasaron el plazo
      </caption>
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th v-if="seleccionable" scope="col" class="w-10 px-4 py-3 print:hidden">
            <input
              type="checkbox"
              class="size-4 rounded"
              aria-label="Seleccionar todos los cheques filtrados"
              :checked="todosMarcados"
              @change="alMarcarTodos"
            />
          </th>
          <th scope="col" class="px-4 py-3 font-medium">Cuenta</th>
          <th scope="col" class="px-4 py-3 font-medium">No.</th>
          <th scope="col" class="px-4 py-3 font-medium">Fecha</th>
          <th scope="col" class="px-4 py-3 font-medium">Antigüedad</th>
          <th scope="col" class="px-4 py-3 font-medium">Beneficiario</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Monto</th>
          <th scope="col" class="px-4 py-3 font-medium">Mes</th>
          <th scope="col" class="px-4 py-3 font-medium">Origen</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <FilaDeChequeCaduco
          v-for="cheque in cheques"
          :key="cheque.chequeId"
          :cheque="cheque"
          :seleccionable="seleccionable"
          :marcado="seleccion.includes(cheque.chequeId)"
          @marcar="(marcado) => emit('marcar', cheque.chequeId, marcado)"
        />
      </tbody>
    </table>
  </div>
</template>
