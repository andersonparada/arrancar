<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FiltrosDeMovimientos } from '../../composables/movimientos/filtros-de-movimientos';

/** Cuenta y fechas; con `opcionesDeConcepto` (solo el reporte) suma el filtro por concepto. */
defineProps<{ opcionesDeCuenta: OpcionDeRegistro[]; opcionesDeConcepto?: OpcionDeRegistro[] }>();
const filtros = defineModel<FiltrosDeMovimientos>({ required: true });
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid gap-3 sm:grid-cols-2" :class="opcionesDeConcepto ? 'lg:grid-cols-4' : 'sm:grid-cols-3'">
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDeCuenta" />
      <CampoSelector
        v-if="opcionesDeConcepto"
        v-model="filtros.conceptoId"
        etiqueta="Concepto"
        :opciones="opcionesDeConcepto"
      />
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
    </div>
  </TarjetaBase>
</template>
