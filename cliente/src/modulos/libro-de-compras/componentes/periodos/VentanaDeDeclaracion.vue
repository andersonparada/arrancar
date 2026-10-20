<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { opcionesDeFormulario, type DeclaracionEnEdicion } from '../../composables/periodos/datos-de-periodos';
import { VENTANA_DE_DECLARACION as textos } from '../../textos-de-periodos';

/**
 * Declarar un período (o rectificarlo): el formulario, el número y la fecha son opcionales. El resumen dice qué va a
 * pasar antes de confirmar.
 */
defineProps<{
  abierta: boolean;
  rectificacion: boolean;
  resumen: string[];
  enviando: boolean;
  errores: Record<string, string>;
}>();
const edicion = defineModel<DeclaracionEnEdicion>({ required: true });
defineEmits<{ guardar: []; cerrar: [] }>();
const formularios = opcionesDeFormulario();
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="rectificacion ? textos.tituloRectificacion : textos.titulo"
    @cerrar="$emit('cerrar')"
  >
    <form id="declarar-periodo" class="flex flex-col gap-4" novalidate @submit.prevent="$emit('guardar')">
      <ul class="list-disc space-y-1 rounded-lg bg-tierra-100 p-3 pl-7 text-sm dark:bg-tierra-800">
        <li v-for="linea in resumen" :key="linea">{{ linea }}</li>
      </ul>
      <p v-if="errores.periodo" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ errores.periodo }}</p>
      <CampoSelector
        v-model="edicion.formulario"
        :etiqueta="textos.formulario"
        :opciones="formularios"
        :error="errores.formulario"
      />
      <CampoTexto
        v-model="edicion.numero"
        :etiqueta="textos.numero"
        :ayuda="textos.numeroAyuda"
        :error="errores.numeroDeFormulario"
        :longitud-maxima="40"
        sin-correccion
      />
      <CampoTexto
        v-model="edicion.fecha"
        tipo="date"
        :etiqueta="textos.fecha"
        :ayuda="textos.fechaAyuda"
        :error="errores.fechaDePresentacion"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="declarar-periodo" :cargando="enviando">
        {{ rectificacion ? textos.botonRectificacion : textos.boton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
