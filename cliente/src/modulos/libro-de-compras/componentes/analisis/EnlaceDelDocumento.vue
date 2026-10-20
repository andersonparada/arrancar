<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { numeroDeDocumento } from '../../composables/libro/datos-del-libro';
import type { DocumentoDeLinea } from '../../servicios/analisis.api';

/** El número del documento, que lleva a su ficha. */
defineProps<{ documento: Pick<DocumentoDeLinea, 'documentoId' | 'serie' | 'numero'> }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: documento.documentoId } }"
    class="whitespace-nowrap font-medium underline underline-offset-2 hover:text-campo-700 dark:hover:text-campo-300"
    :aria-label="`Ver el documento ${numeroDeDocumento(documento)}`"
  >
    {{ numeroDeDocumento(documento) }}
  </RouterLink>
</template>
