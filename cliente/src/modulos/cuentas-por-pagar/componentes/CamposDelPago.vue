<script setup lang="ts">
import CondicionesDelCheque from '@/modulos/core/componentes/CondicionesDelCheque.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  MAXIMO_DE_REFERENCIA,
  MAXIMO_DEL_MOTIVO_DEL_PAGO,
  type EdicionDePago,
} from '../composables/pagos/edicion-de-pago';

/** Los datos propios del pago: fecha, no negociable, referencia o recibo, motivo (apertura) y observaciones. */
defineProps<{
  errores: Record<string, string>;
  /** La última fecha que deja elegir el calendario. */
  maximo?: string;
  /** La fecha que se usará sin poder cambiarla (apertura con la carga inicial abierta). */
  fechaFija: string | null;
  ayudaDeLaFecha: string;
}>();
const edicion = defineModel<EdicionDePago>({ required: true });
const nombreDeLaReferencia = (forma: EdicionDePago['forma']): string =>
  forma === 'nota_ligada' ? 'Recibo del proveedor' : 'Referencia';
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <CampoTexto
      v-if="fechaFija"
      :model-value="fechaFija"
      etiqueta="Fecha del pago"
      tipo="date"
      solo-lectura
      :ayuda="ayudaDeLaFecha"
    />
    <CampoTexto
      v-else
      v-model="edicion.fecha"
      etiqueta="Fecha del pago"
      tipo="date"
      requerido
      :maximo="maximo"
      :ayuda="ayudaDeLaFecha"
      :error="errores.fecha"
    />
    <CampoTexto
      v-model="edicion.referencia"
      :etiqueta="
        edicion.forma === 'cuenta_de_apertura'
          ? 'Comprobante del sistema anterior'
          : nombreDeLaReferencia(edicion.forma)
      "
      contar
      :longitud-maxima="MAXIMO_DE_REFERENCIA"
      :error="errores.referencia"
    />
    <CampoTexto
      v-if="edicion.forma === 'cuenta_de_apertura'"
      v-model="edicion.motivo"
      class="sm:col-span-2"
      etiqueta="Motivo"
      requerido
      multilinea
      contar
      :longitud-maxima="MAXIMO_DEL_MOTIVO_DEL_PAGO"
      ayuda="Por qué se da por pagado: por ejemplo, «se pagó en enero con el cheque 123 del sistema anterior»."
      :error="errores.motivo"
    />
    <CondicionesDelCheque
      v-if="edicion.forma === 'cheque'"
      v-model:no-negociable="edicion.noNegociable"
      v-model:para-abono-en-cuenta="edicion.paraAbonoEnCuenta"
      class="sm:col-span-2"
    />
    <CampoTexto v-model="edicion.observaciones" class="sm:col-span-2" etiqueta="Observaciones" multilinea />
  </div>
</template>
