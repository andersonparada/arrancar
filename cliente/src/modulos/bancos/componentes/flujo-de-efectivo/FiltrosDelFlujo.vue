<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FiltrosDelFlujo } from '../../composables/flujo-de-efectivo/filtros-del-flujo';

/** Cuenta (o todas) y rango de fechas; el rango se valida aquí mismo antes de pedirlo al servidor. */
defineProps<{ opcionesDeCuenta: OpcionDeRegistro[]; errorDelRango?: string }>();
const filtros = defineModel<FiltrosDelFlujo>({ required: true });
</script>

<template>
  <TarjetaBase>
    <div class="grid gap-3 sm:grid-cols-3">
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDeCuenta" />
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" requerido :error="errorDelRango" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" requerido />
    </div>
  </TarjetaBase>
</template>
