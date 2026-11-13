<script setup lang="ts">
import { ExternalLink, Pencil } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import type { FichaDelDocumento } from '../servicios/tipos';

/** Los enlaces del pie de la ficha: al registro en Libro de compras o, en un saldo inicial, a su corrección. */
defineProps<{ ficha: FichaDelDocumento }>();
const CLASE = 'inline-flex items-center gap-1.5 text-sm font-medium text-campo-700 underline dark:text-campo-300';
</script>

<template>
  <RouterLink
    v-if="ficha.documentoId"
    v-permiso="'libro-de-compras.documentos.ver'"
    :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: ficha.documentoId } }"
    :class="CLASE"
  >
    <ExternalLink class="size-4" aria-hidden="true" />
    Ver el registro en el libro de compras
  </RouterLink>
  <RouterLink
    v-if="ficha.origen === 'saldo_inicial'"
    v-permiso="'cuentas-por-pagar.saldos-iniciales.editar'"
    :to="{ name: 'cuentas-por-pagar.saldos-iniciales', query: { corregir: ficha.id } }"
    :class="CLASE"
  >
    <Pencil class="size-4" aria-hidden="true" />
    Corregir en Saldos iniciales
  </RouterLink>
</template>
