<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FiltrosPorConcepto } from '../../composables/movimientos-por-concepto/filtros-por-concepto';
import SelectorDeConceptos from './SelectorDeConceptos.vue';

/** Cuenta (o todas), conceptos (o todos) y rango de fechas; el rango se valida aquí antes de pedirlo al servidor. */
defineProps<{
  opcionesDeCuenta: OpcionDeRegistro[];
  opcionesDeConcepto: Array<{ id: string; nombre: string }>;
  errorDelRango?: string;
}>();
const filtros = defineModel<FiltrosPorConcepto>({ required: true });
</script>

<template>
  <TarjetaBase>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDeCuenta" />
      <SelectorDeConceptos v-model="filtros.conceptoIds" :opciones="opcionesDeConcepto" />
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" requerido :error="errorDelRango" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" requerido />
    </div>
  </TarjetaBase>
</template>
