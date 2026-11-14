<script setup lang="ts">
import { mensajeDeDesautorizacion, resumenDeAnulacion } from '../composables/reglas-de-acciones';
import type { usarAccionesDelDocumento } from '../composables/usar-acciones-del-documento';
import type { FichaDelDocumento } from '../servicios/tipos';
import VentanaDeAnulacion from './VentanaDeAnulacion.vue';
import VentanaDeDesautorizacion from './VentanaDeDesautorizacion.vue';
import VentanaDeVencimiento from './VentanaDeVencimiento.vue';

/** Las ventanas de las acciones del documento: desautorizar, cambiar el vencimiento y anular el registro. */
const props = defineProps<{ ficha: FichaDelDocumento; acciones: ReturnType<typeof usarAccionesDelDocumento> }>();
const { desautorizacion, vencimiento, anulacion } = props.acciones;
</script>

<template>
  <VentanaDeDesautorizacion
    v-model="desautorizacion.edicion.value"
    :resumen="mensajeDeDesautorizacion(ficha)"
    :errores="desautorizacion.errores.value"
    :enviando="desautorizacion.enviando.value"
    @cerrar="desautorizacion.cerrar"
    @guardar="desautorizacion.desautorizar"
  />
  <VentanaDeVencimiento
    v-model="vencimiento.edicion.value"
    :errores="vencimiento.errores.value"
    :enviando="vencimiento.enviando.value"
    @cerrar="vencimiento.cerrar"
    @guardar="vencimiento.cambiar"
  />
  <VentanaDeAnulacion
    v-model="anulacion.edicion.value"
    :resumen="resumenDeAnulacion(ficha)"
    :errores="anulacion.errores.value"
    :enviando="anulacion.enviando.value"
    @cerrar="anulacion.cerrar"
    @guardar="anulacion.anular"
  />
</template>
