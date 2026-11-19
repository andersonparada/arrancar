<script setup lang="ts">
import { watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeActivoNuevo } from '../../composables/bandeja/edicion-de-capitalizacion';
import CuadriculaDeUnidades from './CuadriculaDeUnidades.vue';

/**
 * Dónde queda el activo nuevo y su detalle: localidad, departamento, responsable, bodega, marca, modelo y la
 * cuadrícula de unidades. Todo es opcional y se puede completar después en la ficha.
 */
defineProps<{
  errores: Record<string, string>;
  localidades: OpcionDeRegistro[];
  departamentos: OpcionDeRegistro[];
}>();
const nuevo = defineModel<EdicionDeActivoNuevo>({ required: true });

watch(
  () => nuevo.value.localidadId,
  () => (nuevo.value.departamentoId = null),
);
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoSelector v-model="nuevo.localidadId" etiqueta="Localidad" :opciones="localidades" />
      <CampoSelector v-model="nuevo.departamentoId" etiqueta="Departamento" :opciones="departamentos" />
      <CampoTexto v-model="nuevo.responsable" etiqueta="Responsable" :longitud-maxima="150" />
      <CampoInterruptor
        v-model="nuevo.enBodega"
        etiqueta="En bodega de activos"
        descripcion="Guardado, listo pero sin entregar a nadie."
      />
      <CampoTexto v-model="nuevo.marca" etiqueta="Marca" :longitud-maxima="80" />
      <CampoTexto v-model="nuevo.modelo" etiqueta="Modelo" :longitud-maxima="80" />
    </div>
    <CuadriculaDeUnidades v-model="nuevo.renglones" :errores="errores" />
  </div>
</template>
