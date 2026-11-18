<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';

/** El nombre del proveedor; lleva a su estado de cuenta solo si quien lo ve puede abrir ese reporte. */
defineProps<{ id: string; nombre: string }>();
const sesion = usarSesion();
</script>

<template>
  <RouterLink
    v-if="sesion.puede('cuentas-por-pagar.reportes-de-saldos.ver')"
    :to="{ name: 'cuentas-por-pagar.reportes.estado-de-cuenta', query: { proveedorId: id } }"
    class="rounded text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
  >
    {{ nombre }}
  </RouterLink>
  <span v-else>{{ nombre }}</span>
</template>
