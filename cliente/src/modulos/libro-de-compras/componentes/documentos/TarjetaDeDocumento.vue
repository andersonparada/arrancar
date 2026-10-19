<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import {
  detallesDeTarjeta,
  textoDeEstado,
  tituloDeDocumento,
  tonoDeEstado,
} from '../../composables/documentos/detalles-de-documento';
import type { DocumentoEnLista } from '../../servicios/documentos.api';

const props = defineProps<{ documento: DocumentoEnLista }>();
const destino = computed(() => ({
  name: 'libro-de-compras.documentos.ficha',
  params: { documentoId: props.documento.id },
}));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeDocumento(documento)"
    :detalles="detallesDeTarjeta(documento)"
    permiso="libro-de-compras.documentos.ver"
    :destino="destino"
    :class="documento.estado === 'anulado' ? 'opacity-80' : ''"
  >
    <template #destacado>
      <p class="truncate text-sm text-tierra-600 dark:text-tierra-300">{{ documento.nombreEmisor }}</p>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        <InsigniaBase :tono="tonoDeEstado(documento.estado)">{{ textoDeEstado(documento.estado) }}</InsigniaBase>
        <InsigniaBase v-if="!documento.muestraEnReportesSat" tono="trigo">Fuera de reportes SAT</InsigniaBase>
      </div>
    </template>
  </TarjetaDeRegistro>
</template>
