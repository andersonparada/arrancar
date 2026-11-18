<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { filasDePagosDeLaContrasena } from '../composables/contrasenas/pagos-de-la-contrasena';
import type { PagoDeLaContrasena } from '../servicios/tipos-de-pagos';

/** Los pagos que entregaron algo a esta contraseña (vigentes y anulados) con lo que cada uno entregó dentro de ella. */
const props = defineProps<{ pagos: PagoDeLaContrasena[] }>();
const filas = computed(() => filasDePagosDeLaContrasena({ pagos: props.pagos }));
</script>

<template>
  <p v-if="filas.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
    Esta contraseña todavía no tiene pagos.
  </p>
  <ul v-else class="space-y-2">
    <li
      v-for="fila in filas"
      :key="fila.id"
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
      :class="{ 'opacity-70': fila.anulado }"
    >
      <div class="min-w-0">
        <p class="flex flex-wrap items-center gap-2 font-medium" :class="{ 'line-through': fila.anulado }">
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: fila.id } }"
            class="underline-offset-2 hover:underline"
          >
            {{ fila.titulo }}
          </RouterLink>
          <InsigniaBase v-if="fila.anulado" tono="rojo">Anulado</InsigniaBase>
          <InsigniaBase v-if="fila.marcas.includes('Posfechado')" tono="trigo">Posfechado</InsigniaBase>
        </p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ fila.detalle }}</p>
      </div>
      <p class="text-right font-semibold" :class="{ 'line-through': fila.anulado }">{{ fila.monto }}</p>
    </li>
  </ul>
</template>
