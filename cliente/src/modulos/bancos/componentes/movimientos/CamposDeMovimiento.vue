<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO } from '../../composables/movimientos/edicion-de-movimiento';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeMovimiento } from '../../composables/movimientos/edicion-de-movimiento';

/**
 * Los campos del movimiento; los usan la ventana y el formulario en página, así
 * se ven igual. Al corregir (con `id`) la cuenta se ve pero no se cambia.
 */
defineProps<{ errores: Record<string, string>; referencias: Record<'cuentaBancariaId', OpcionDeRegistro[]> }>();
const edicion = defineModel<EdicionDeMovimiento>({ required: true });
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
    <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="any" requerido :error="errores.monto" />
    <CampoInterruptor v-model="edicion.saldoInicial" etiqueta="Es el saldo inicial de la cuenta" />
    <CampoTexto
      v-model="edicion.referencia"
      etiqueta="Referencia (boleta o autorización)"
      :error="errores.referencia"
    />
    <CampoTexto v-model="edicion.beneficiario" etiqueta="Beneficiario u origen" :error="errores.beneficiario" />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
  </div>
</template>
