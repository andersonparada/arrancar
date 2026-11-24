<script setup lang="ts">
import { cifrasDelAnticipo, explicacionDelSaldo } from '../composables/anticipos/ficha-de-anticipo';
import type { Anticipo } from '../servicios/anticipos.api';

/** Lo entregado, lo gastado y lo que falta por justificar, bien a la vista, con una frase que dice qué sigue. */
defineProps<{ ficha: Pick<Anticipo, 'monto' | 'gastado' | 'porJustificar' | 'estado'> }>();
</script>

<template>
  <section
    aria-label="Resumen del anticipo"
    class="rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <dl class="grid grid-cols-3 gap-3 text-center sm:text-left">
      <div v-for="cifra in cifrasDelAnticipo(ficha)" :key="cifra.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
        <dd
          class="mt-0.5 whitespace-nowrap font-semibold"
          :class="cifra.enfasis ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'"
        >
          {{ cifra.valor }}
        </dd>
      </div>
    </dl>
    <p v-if="ficha.estado === 'abierto'" class="mt-3 text-sm text-tierra-600 dark:text-tierra-300">
      {{ explicacionDelSaldo(ficha) }}
    </p>
  </section>
</template>
