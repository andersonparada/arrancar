<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeVigenciaDeCombustible } from '../../composables/vigencias-de-combustible/edicion-de-vigencia-de-combustible';

/** Los campos de la vigencia de combustible; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string>; referencias: Record<'combustibleId', OpcionDeRegistro[]> }>();
const edicion = defineModel<EdicionDeVigenciaDeCombustible>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.combustibleId"
      etiqueta="Combustible"
      :opciones="referencias.combustibleId"
      requerido
      :error="errores.combustibleId"
    />
    <CampoTexto
      v-model="edicion.idpPorGalon"
      etiqueta="IDP por galón (Q)"
      tipo="number"
      paso="any"
      requerido
      :error="errores.idpPorGalon"
    />
    <CampoTexto
      v-model="edicion.porcentajeDeEtanol"
      etiqueta="Porcentaje de etanol"
      tipo="number"
      paso="any"
      requerido
      :error="errores.porcentajeDeEtanol"
    />
    <CampoTexto
      v-model="edicion.vigenteDesde"
      etiqueta="Vigente desde"
      tipo="date"
      requerido
      :error="errores.vigenteDesde"
    />
    <CampoTexto v-model="edicion.vigenteHasta" etiqueta="Vigente hasta" tipo="date" :error="errores.vigenteHasta" />
  </div>
</template>
