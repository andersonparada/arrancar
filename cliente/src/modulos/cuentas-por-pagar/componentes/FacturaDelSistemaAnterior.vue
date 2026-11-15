<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import {
  ayudaDeFacturaAnterior,
  detallesDeFacturaAnterior,
  textoDeFacturaAnterior,
} from '../composables/notas-del-sistema-anterior';
import type { FichaDelDocumento } from '../servicios/tipos';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** En la ficha de una nota del libro sobre una factura del sistema anterior: qué corrige y qué hacer con ella. */
defineProps<{ ficha: FichaDelDocumento }>();
</script>

<template>
  <SeccionDeFicha v-if="textoDeFacturaAnterior(ficha)" titulo="Factura del sistema anterior">
    <p class="text-sm">
      {{ textoDeFacturaAnterior(ficha) }}
      <RouterLink
        v-if="ficha.documentoAfectadoId"
        :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: ficha.documentoAfectadoId } }"
        class="font-medium text-campo-700 underline dark:text-campo-300"
      >
        Ver el saldo inicial
      </RouterLink>
    </p>
    <DatosDelRegistro
      v-if="detallesDeFacturaAnterior(ficha).length"
      class="mt-2"
      :detalles="detallesDeFacturaAnterior(ficha)"
    />
    <p v-if="ayudaDeFacturaAnterior(ficha)" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">
      {{ ayudaDeFacturaAnterior(ficha) }}
    </p>
  </SeccionDeFicha>
</template>
