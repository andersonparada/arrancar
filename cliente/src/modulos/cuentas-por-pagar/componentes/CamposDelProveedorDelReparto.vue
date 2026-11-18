<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { claveDeProveedor } from '../composables/pagos/errores-del-reparto';
import { MAXIMO_DE_REFERENCIA } from '../composables/pagos/edicion-de-pago';
import {
  MAXIMO_DE_QUIEN_RECIBE,
  MAXIMO_DEL_MOTIVO_SIN_BANCARIZAR,
  type ProveedorDelReparto,
} from '../composables/pagos/reparto-de-efectivo';

/**
 * Lo que se escribe de un pago del reparto además de los montos: la fecha, quién recibe por el proveedor (el que firma el
 * recibo), el número del recibo del proveedor y, si el servidor bloqueó el pago por bancarización, qué hacer.
 */
defineProps<{
  errores: Record<string, string>;
  hoy: string;
  puedeSinBancarizar: boolean;
  /** Anticipo no bloqueante: el mes del proveedor llega al umbral. */
  aviso: string | null;
  /** La regla y lo que se pierde, para quien debe escribir el motivo de la excepción. */
  explicacion: string;
}>();
const proveedor = defineModel<ProveedorDelReparto>({ required: true });

const error = (campo: string, errores: Record<string, string>): string | undefined =>
  errores[claveDeProveedor(proveedor.value.proveedorId, campo)];
const descartarBloqueo = (): void => {
  Object.assign(proveedor.value, { bloqueo: null, pedirMotivo: false, motivoSinBancarizar: '' });
};
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CampoTexto
        v-model="proveedor.edicion.fecha"
        etiqueta="Fecha del pago"
        tipo="date"
        :maximo="hoy"
        requerido
        :error="error('fecha', errores)"
      />
      <CampoTexto
        v-model="proveedor.recibidoPor"
        etiqueta="Recibe por el proveedor"
        :longitud-maxima="MAXIMO_DE_QUIEN_RECIBE"
        ayuda="Opcional: el nombre sale impreso en el recibo."
        :error="error('recibidoPor', errores)"
      />
      <CampoTexto
        v-model="proveedor.edicion.referencia"
        etiqueta="Número del recibo del proveedor"
        :longitud-maxima="MAXIMO_DE_REFERENCIA"
        ayuda="Opcional, si el proveedor dio uno."
        :error="error('referencia', errores)"
      />
    </div>

    <p
      v-if="aviso && !proveedor.bloqueo"
      class="flex items-start gap-2 text-sm text-tierra-700 dark:text-tierra-200"
      role="status"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ aviso }}
    </p>

    <div
      v-if="proveedor.bloqueo"
      class="space-y-3 rounded-xl bg-red-50 p-3 text-sm ring-1 ring-red-300 dark:bg-red-950/40 dark:ring-red-800"
      role="alert"
    >
      <p>{{ proveedor.bloqueo }}</p>
      <p v-if="puedeSinBancarizar">{{ explicacion }}</p>
      <template v-if="puedeSinBancarizar">
        <CampoTexto
          v-model="proveedor.motivoSinBancarizar"
          etiqueta="Por qué se paga en efectivo sobre el umbral"
          requerido
          multilinea
          :longitud-maxima="MAXIMO_DEL_MOTIVO_SIN_BANCARIZAR"
          ayuda="Queda en la auditoría y en el reporte de pagos en efectivo sobre el umbral."
          :error="error('motivoSinBancarizar', errores)"
        />
        <BotonBase variante="fantasma" pequeno @click="descartarBloqueo"
          >Ya no hace falta (cambié los montos)</BotonBase
        >
      </template>
      <p v-else>
        Quite a este proveedor del reparto y págueselo con cheque o transferencia en «Nuevo pago». Para pagarlo en
        efectivo hace falta el permiso «Pagar en efectivo sobre el umbral de bancarización»: pídalo a quien administra
        los permisos.
      </p>
    </div>
  </div>
</template>
