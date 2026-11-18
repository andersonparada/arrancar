<script setup lang="ts">
/** Ajustes vigentes por causa y efecto: cuánto va a pérdida, a la cuenta transitoria y a otros ingresos. */
defineProps<{ filas: { clave: string; causa: string; efecto: string; cantidad: number; monto: string }[] }>();
</script>

<template>
  <section v-if="filas.length" aria-label="Ajustes vigentes por causa y efecto" class="overflow-x-auto">
    <table class="w-full text-sm print:text-[10px]">
      <caption class="pb-1 text-left text-xs font-medium text-tierra-500 dark:text-tierra-300">
        Ajustes vigentes por causa y efecto
      </caption>
      <thead class="text-xs text-tierra-500 dark:text-tierra-300">
        <tr>
          <th scope="col" class="px-2 py-1 text-left font-medium">Causa</th>
          <th scope="col" class="px-2 py-1 text-left font-medium">Efecto</th>
          <th scope="col" class="px-2 py-1 text-right font-medium">Cantidad</th>
          <th scope="col" class="px-2 py-1 text-right font-medium">Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="fila in filas" :key="fila.clave" class="border-t border-tierra-100 dark:border-tierra-700">
          <th scope="row" class="px-2 py-1 text-left font-normal">{{ fila.causa }}</th>
          <td class="px-2 py-1">{{ fila.efecto }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ fila.cantidad }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ fila.monto }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
