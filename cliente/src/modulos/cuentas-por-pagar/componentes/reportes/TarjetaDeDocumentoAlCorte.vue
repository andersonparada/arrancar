<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  estaVencida,
  notasDeLaFila,
  textoDeContrasena,
  textoDeVencimiento,
  tituloDeLaFila,
  tonoDeEstadoDePago,
} from '../../composables/reportes/detalles-de-documentos-al-corte';
import { TEXTOS_DE_ESTADO_DE_PAGO } from '../../composables/reportes/vistas-de-documentos';
import type { FilaDeDocumentoAlCorte } from '../../servicios/tipos-de-reportes';

/** Un cargo en el celular: lleva a su ficha, con su saldo y lo que lo explica. */
defineProps<{ fila: FilaDeDocumentoAlCorte }>();
</script>

<template>
  <TarjetaBase>
    <RouterLink
      :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.id } }"
      class="flex flex-col gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      <span class="flex items-start justify-between gap-2">
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ tituloDeLaFila(fila) }}</span>
          <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">{{ fila.proveedorNombre }}</span>
        </span>
        <span class="flex shrink-0 items-center gap-1">
          <span class="text-lg font-semibold tabular-nums">{{ formatearMonto(fila.saldo) }}</span>
          <ChevronRight class="size-4 text-tierra-400" aria-hidden="true" />
        </span>
      </span>
      <span class="flex flex-wrap gap-1.5">
        <InsigniaBase :tono="tonoDeEstadoDePago(fila.estadoDePago)">
          {{ TEXTOS_DE_ESTADO_DE_PAGO[fila.estadoDePago] }}
        </InsigniaBase>
        <InsigniaBase :tono="fila.autorizado ? 'campo' : 'trigo'">
          {{ fila.autorizado ? 'Autorizado' : 'Sin autorizar' }}
        </InsigniaBase>
        <InsigniaBase v-if="estaVencida(fila)" tono="rojo">Vencido</InsigniaBase>
      </span>
      <span class="text-sm text-tierra-600 dark:text-tierra-300">
        Emitido {{ formatearFecha(fila.fechaEmision) }} · {{ textoDeVencimiento(fila) }}
      </span>
      <span class="text-sm tabular-nums text-tierra-600 dark:text-tierra-300">
        Total {{ formatearMonto(fila.total) }} · Pagado {{ formatearMonto(fila.pagado) }}
        <template v-if="Number(fila.comprometido) !== 0">
          · Comprometido {{ formatearMonto(fila.comprometido) }}</template
        >
      </span>
      <span v-if="textoDeContrasena(fila)" class="text-sm text-tierra-600 dark:text-tierra-300">
        Contraseña {{ textoDeContrasena(fila) }}
      </span>
      <span v-for="nota in notasDeLaFila(fila, formatearMonto)" :key="nota" class="text-xs text-tierra-500">{{
        nota
      }}</span>
    </RouterLink>
  </TarjetaBase>
</template>
