<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import AvisoDeFecha from '../comunes/AvisoDeFecha.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';
import SugerenciaAlCapturar from '../sugerencias/SugerenciaAlCapturar.vue';
import type { EdicionDeCheque } from '../../composables/cheques/edicion-de-cheque';

/** Los campos para emitir un cheque: cuenta, número (propuesto), fecha, monto, beneficiario y observaciones. */
defineProps<{
  errores: Record<string, string>;
  referencias: { cuentaBancariaId: OpcionDeRegistro[] };
  opcionesDeCheque: OpcionDeRegistro[];
  opcionesDeConcepto: OpcionDeRegistro[];
  sugerencia: SugerenciaDeMovimiento | null;
}>();
const edicion = defineModel<EdicionDeCheque>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.cuentaBancariaId"
      etiqueta="Cuenta"
      :opciones="referencias.cuentaBancariaId"
      requerido
      :error="errores.cuentaBancariaId"
    />
    <CampoSelector
      v-model="edicion.chequeId"
      etiqueta="Número de cheque"
      :opciones="opcionesDeCheque"
      requerido
      :deshabilitado="!edicion.cuentaBancariaId"
      :error="errores.chequeId"
    />
    <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
    <AvisoDeFecha :fecha="edicion.fecha" cheque />
    <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="any" requerido :error="errores.monto" />
    <CampoTexto v-model="edicion.beneficiario" etiqueta="Beneficiario" requerido :error="errores.beneficiario" />
    <CampoSelector
      v-model="edicion.conceptoId"
      etiqueta="Concepto"
      :opciones="opcionesDeConcepto"
      requerido
      :error="errores.conceptoId"
    />
    <SugerenciaAlCapturar :sugerencia="sugerencia" @usar="edicion.conceptoId = $event" />
    <CampoInterruptor v-model="edicion.noNegociable" etiqueta="No negociable" />
    <CampoTexto v-model="edicion.referencia" etiqueta="Referencia" :error="errores.referencia" />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
  </div>
</template>
