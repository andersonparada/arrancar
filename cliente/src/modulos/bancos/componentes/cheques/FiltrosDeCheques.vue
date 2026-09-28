<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FiltrosDeCheques } from '../../composables/cheques/filtros-de-cheques';

defineProps<{ opcionesDeCuenta: OpcionDeRegistro[] }>();
const filtros = defineModel<FiltrosDeCheques>({ required: true });

const OPCIONES_DE_ESTADO = [
  { valor: '' as const, texto: 'Todos' },
  { valor: 'emitido' as const, texto: 'Emitidos' },
  { valor: 'anulado' as const, texto: 'Anulados' },
];
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid gap-3 sm:grid-cols-4">
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDeCuenta" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" />
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
    </div>
  </TarjetaBase>
</template>
