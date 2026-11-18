<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import {
  TEXTOS_DE_FORMA,
  textoDelDocumentoPagado,
  textoDeQuienRegistro,
} from '../../composables/reportes/pagos-realizados';
import type { LineaDePagoRealizado } from '../../servicios/tipos-de-reportes-de-pagos';

/** Una línea de pago en el celular: lo esencial arriba y los datos de control debajo; lleva a la ficha del documento. */
defineProps<{ fila: LineaDePagoRealizado }>();
</script>

<template>
  <TarjetaBase :class="{ 'opacity-70': fila.estado === 'anulado' }">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ fila.proveedorNombre }}</p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          Pago N.º {{ fila.numeroDelPago }} · {{ formatearFecha(fila.fecha) }}
        </p>
      </div>
      <p class="shrink-0 text-lg font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</p>
    </div>
    <div class="mt-2 flex flex-wrap gap-1.5">
      <InsigniaBase>{{ TEXTOS_DE_FORMA[fila.forma] }}</InsigniaBase>
      <InsigniaBase v-if="fila.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
      <InsigniaBase v-if="fila.misma" tono="trigo">Misma persona</InsigniaBase>
    </div>
    <RouterLink
      :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.documentoId } }"
      class="mt-2 block rounded text-sm text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300"
    >
      Documento {{ textoDelDocumentoPagado(fila) }} · contraseña {{ fila.contrasena }}
    </RouterLink>
    <p class="mt-1 text-sm tabular-nums text-tierra-600 dark:text-tierra-300">
      Retención {{ formatearMonto(fila.retencionDescontada) }} · Cubre {{ formatearMonto(fila.cubre) }}
    </p>
    <dl class="mt-2 space-y-0.5 text-xs text-tierra-600 dark:text-tierra-300">
      <div v-if="fila.documentoBancario || fila.cuenta">
        <dt class="inline font-medium">Banco:</dt>
        <dd class="inline">{{ [fila.documentoBancario, fila.cuenta].filter(Boolean).join(' · ') }}</dd>
      </div>
      <div v-if="textoDeQuienRegistro(fila)">
        <dt class="inline font-medium">Documento:</dt>
        <dd class="inline">{{ textoDeQuienRegistro(fila) }}</dd>
      </div>
      <div>
        <dt class="inline font-medium">Autorizó:</dt>
        <dd class="inline">{{ formatearTexto(fila.autorizoElDocumento) }}</dd>
      </div>
      <div>
        <dt class="inline font-medium">Registró el pago:</dt>
        <dd class="inline">{{ formatearTexto(fila.registroElPago) }}</dd>
      </div>
      <div v-if="fila.estado === 'anulado'">
        <dt class="inline font-medium">Anulado el {{ formatearFecha(fila.fechaDeAnulacion) }}:</dt>
        <dd class="inline">{{ formatearTexto(fila.motivoDeAnulacion) }}</dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
