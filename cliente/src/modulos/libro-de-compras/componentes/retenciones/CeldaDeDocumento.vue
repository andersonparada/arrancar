<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { formatearTexto } from '@/modulos/core/utilidades/formato';
import { nombreDelDocumento } from '../../composables/retenciones/datos-de-retenciones';
import type { RetencionDelMes } from '../../servicios/retenciones.api';

/** El documento (con enlace a su ficha), su UUID y el proveedor de una retención. */
defineProps<{ retencion: RetencionDelMes }>();
</script>

<template>
  <div class="min-w-0">
    <RouterLink
      :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: retencion.documento.id } }"
      class="font-medium underline underline-offset-2"
    >
      {{ nombreDelDocumento(retencion.documento) }}
    </RouterLink>
    <span
      v-if="retencion.documento.estado === 'anulado'"
      class="ml-1 text-xs font-medium text-red-700 dark:text-red-400"
    >
      (anulado)
    </span>
    <p class="break-words">{{ retencion.proveedor.nombre }}</p>
    <p class="text-xs text-tierra-600 dark:text-tierra-300">NIT {{ formatearTexto(retencion.proveedor.nit) }}</p>
    <p v-if="retencion.documento.uuid" class="break-all text-xs text-tierra-500">{{ retencion.documento.uuid }}</p>
  </div>
</template>
