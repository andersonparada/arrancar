<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { opcionesDeProveedor } from '../../composables/documentos/filtros-de-documentos';
import { opcionesDePeriodoDelLibro } from '../../composables/libro/datos-del-libro';
import { opcionesDeGrupo } from '../../composables/retenciones/datos-de-retenciones';
import type { FiltrosDeConstanciasPendientes } from '../../servicios/constancias-pendientes.api';
import type { ProveedorParaFiltro } from '../../servicios/documentos.api';
import { VENTANA_DE_CONSTANCIAS_PENDIENTES as textos } from '../../textos-de-constancias-pendientes';

/** Hasta qué mes, el grupo y el proveedor; cada cambio vuelve a pedir el reporte. */
const props = defineProps<{ proveedores: ProveedorParaFiltro[]; cantidad: number }>();
defineEmits<{ quitar: [] }>();
const filtros = defineModel<FiltrosDeConstanciasPendientes>({ required: true });
const meses = computed(() => opcionesDePeriodoDelLibro(new Date(), filtros.value.hasta));
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <form class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden" @submit.prevent>
    <CampoSelector v-model="filtros.hasta" :etiqueta="textos.hasta" :opciones="meses" />
    <CampoSelector v-model="filtros.grupo" :etiqueta="textos.grupo" :opciones="opcionesDeGrupo()" />
    <CampoSelector v-model="filtros.proveedorId" :etiqueta="textos.proveedor" :opciones="opcionesDeProveedores" />
    <div v-if="cantidad > 0" class="flex items-end">
      <BotonBase variante="secundario" @click="$emit('quitar')">Quitar filtros ({{ cantidad }})</BotonBase>
    </div>
  </form>
</template>
