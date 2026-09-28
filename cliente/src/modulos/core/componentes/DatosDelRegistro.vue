<script setup lang="ts">
import type { DetalleDeRegistro } from '../tipos';
import TarjetaBase from './TarjetaBase.vue';

/** Los datos de un registro en su ficha, ya con formato; todas las fichas generadas se ven así. */
defineProps<{ detalles: DetalleDeRegistro[] }>();
</script>

<template>
  <TarjetaBase>
    <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="detalle in detalles" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="mt-0.5 break-words">{{ detalle.valor }}</dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
