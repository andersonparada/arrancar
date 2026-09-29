<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import AvisoDeFecha from '../comunes/AvisoDeFecha.vue';
import CamposDeIntereses from './CamposDeIntereses.vue';
import SugerenciaAlCapturar from '../sugerencias/SugerenciaAlCapturar.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO } from '../../composables/notas/edicion-de-nota';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';
import type { EdicionDeNota } from '../../composables/notas/edicion-de-nota';

/** Los campos de la nota; al corregir (con `id`) la cuenta se ve pero no se cambia. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<'cuentaBancariaId', OpcionDeRegistro[]>;
  opcionesDeConcepto: OpcionDeRegistro[];
  /** El concepto elegido pide interés bruto e ISR retenido (H8): el monto pasa a ser el neto. */
  pideIntereses: boolean;
  sugerencia: SugerenciaDeMovimiento | null;
}>();
const edicion = defineModel<EdicionDeNota>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.cuentaBancariaId"
      etiqueta="Cuenta"
      :opciones="referencias.cuentaBancariaId"
      requerido
      :deshabilitado="!!edicion.id"
      :error="errores.cuentaBancariaId"
    />
    <CampoSelector
      v-model="edicion.tipo"
      etiqueta="Tipo"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO, false)"
      requerido
      :error="errores.tipo"
    />
    <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
    <AvisoDeFecha :fecha="edicion.fecha" />
    <CampoTexto
      v-model="edicion.monto"
      :etiqueta="pideIntereses ? 'Monto acreditado (neto)' : 'Monto'"
      tipo="number"
      paso="any"
      requerido
      :solo-lectura="pideIntereses"
      :ayuda="pideIntereses ? 'Es el interés bruto menos el ISR retenido.' : undefined"
      :error="errores.monto"
    />
    <CampoTexto
      v-model="edicion.referencia"
      etiqueta="Referencia (boleta o autorización)"
      :error="errores.referencia"
    />
    <CampoTexto v-model="edicion.beneficiario" etiqueta="Beneficiario u origen" :error="errores.beneficiario" />
    <CampoSelector
      v-model="edicion.conceptoId"
      etiqueta="Concepto"
      :opciones="opcionesDeConcepto"
      requerido
      :error="errores.conceptoId"
    />
    <SugerenciaAlCapturar :sugerencia="sugerencia" @usar="edicion.conceptoId = $event" />
    <CamposDeIntereses v-if="pideIntereses" v-model="edicion" :errores="errores" />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
  </div>
</template>
