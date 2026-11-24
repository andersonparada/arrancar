<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeTarjeta, etiquetasDeTarjeta } from '../../composables/documentos/detalles-de-documento';
import { tituloDeDocumento } from '../../composables/documentos/tipos-de-documento';
import type { DocumentoEnLista } from '../../servicios/documentos.api';

const props = defineProps<{ documento: DocumentoEnLista }>();
const destino = computed(() => ({
  name: 'libro-de-ventas.documentos.ficha',
  params: { documentoId: props.documento.id },
}));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeDocumento(documento)"
    :detalles="detallesDeTarjeta(documento)"
    permiso="libro-de-ventas.documentos.ver"
    :destino="destino"
    :class="documento.estado === 'anulado' ? 'opacity-80' : ''"
  >
    <template #destacado>
      <p class="truncate text-sm text-tierra-600 dark:text-tierra-300">{{ documento.nombreReceptor }}</p>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        <InsigniaBase v-for="etiqueta in etiquetasDeTarjeta(documento)" :key="etiqueta.texto" :tono="etiqueta.tono">{{
          etiqueta.texto
        }}</InsigniaBase>
      </div>
    </template>
  </TarjetaDeRegistro>
</template>
