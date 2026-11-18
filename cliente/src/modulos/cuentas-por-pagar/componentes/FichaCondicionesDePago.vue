<script setup lang="ts">
import { computed } from 'vue';
import { ScrollText } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDeCondiciones } from '../composables/condiciones-de-pago';
import { usarFichaDeCondiciones } from '../composables/usar-condiciones-de-pago';

/** El plazo de pago del proveedor y lo que se le debe con la empresa activa, con el acceso a su estado de cuenta. */
const props = defineProps<{ registroId: string }>();
const { datos, cargando } = usarFichaDeCondiciones(() => props.registroId);
const detalles = computed(() =>
  datos.value
    ? detallesDeCondiciones(datos.value.condiciones, datos.value.saldo, datos.value.condiciones.mesesPorOmision)
    : [],
);
</script>

<template>
  <p v-if="cargando && !datos" class="text-sm text-tierra-500" role="status">Cargando condiciones de pago…</p>
  <template v-else-if="datos">
    <DatosDelRegistro :detalles="detalles" />
    <RouterLink
      v-permiso="'cuentas-por-pagar.reportes-de-saldos.ver'"
      :to="{ name: 'cuentas-por-pagar.reportes.estado-de-cuenta', query: { proveedorId: registroId } }"
      class="mt-2 inline-flex items-center gap-1.5 rounded text-sm font-medium text-campo-700 underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300"
    >
      <ScrollText class="size-4" aria-hidden="true" />
      Estado de cuenta
    </RouterLink>
  </template>
</template>
