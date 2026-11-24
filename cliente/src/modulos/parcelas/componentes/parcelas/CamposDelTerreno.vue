<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeParcela } from '../../composables/parcelas/edicion-de-parcela';

/** El punto de la parcela en el mapa y con quién colinda. Todo es opcional; el punto lleva latitud y longitud juntas. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeParcela>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <fieldset class="space-y-3">
      <legend class="text-sm font-semibold text-tierra-800 dark:text-tierra-100">Punto en el mapa (opcional)</legend>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.latitud"
          etiqueta="Latitud"
          tipo="number"
          paso="any"
          ayuda="En Guatemala va entre 13.5 y 18, por ejemplo 14.634915."
          :error="errores.latitud"
        />
        <CampoTexto
          v-model="edicion.longitud"
          etiqueta="Longitud"
          tipo="number"
          paso="any"
          ayuda="En Guatemala es negativa, entre -92.3 y -88.2, por ejemplo -90.506882."
          :error="errores.longitud"
        />
      </div>
    </fieldset>
    <fieldset class="space-y-3">
      <legend class="text-sm font-semibold text-tierra-800 dark:text-tierra-100">Colindancias (opcional)</legend>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.colindanciaNorte" etiqueta="Norte" :error="errores.colindanciaNorte" />
        <CampoTexto v-model="edicion.colindanciaSur" etiqueta="Sur" :error="errores.colindanciaSur" />
        <CampoTexto v-model="edicion.colindanciaOriente" etiqueta="Oriente" :error="errores.colindanciaOriente" />
        <CampoTexto v-model="edicion.colindanciaPoniente" etiqueta="Poniente" :error="errores.colindanciaPoniente" />
      </div>
    </fieldset>
  </div>
</template>
