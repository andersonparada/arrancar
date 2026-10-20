<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import {
  opcionesDeConstancia,
  opcionesDeDocumentos,
  opcionesDeGrupo,
} from '../../composables/retenciones/datos-de-retenciones';
import type { FiltrosDelReporte } from '../../servicios/retenciones.api';
import { VENTANA_DE_RETENCIONES as textos } from '../../textos-de-retenciones';

/** El mes y los filtros del reporte; cada cambio vuelve a pedir el reporte. */
defineProps<{ opcionesDeMes: OpcionBuscable<string>[] }>();
const filtros = defineModel<FiltrosDelReporte>({ required: true });
</script>

<template>
  <form class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden" @submit.prevent>
    <CampoSelector v-model="filtros.mes" :etiqueta="textos.mes" :opciones="opcionesDeMes" />
    <CampoSelector v-model="filtros.grupo" :etiqueta="textos.grupo" :opciones="opcionesDeGrupo()" />
    <CampoSelector v-model="filtros.constancia" :etiqueta="textos.constancia" :opciones="opcionesDeConstancia()" />
    <CampoSelector v-model="filtros.documentos" :etiqueta="textos.documentos" :opciones="opcionesDeDocumentos()" />
  </form>
</template>
