<script setup lang="ts">
import { resumenDeAjuste } from '../composables/ajuste-de-saldo';
import type { AccionesDeNota } from '../composables/usar-acciones-de-nota';
import type { FichaDelDocumento } from '../servicios/tipos';
import VentanaDeAjuste from './VentanaDeAjuste.vue';
import VentanaDeAplicacion from './VentanaDeAplicacion.vue';
import VentanaDeMotivo from './VentanaDeMotivo.vue';

/** Las cuatro ventanas del saldo a favor de una nota: aplicar, ajustar, quitar una aplicación y anular un ajuste. */
const props = defineProps<{ ficha: FichaDelDocumento; acciones: AccionesDeNota }>();
const { aplicacion, ajuste, quitar, anularAjuste } = props.acciones;
</script>

<template>
  <VentanaDeAplicacion
    v-model="aplicacion.edicion.value"
    :errores="aplicacion.errores.value"
    :enviando="aplicacion.enviando.value"
    @cerrar="aplicacion.cerrar"
    @guardar="aplicacion.aplicar"
  />
  <VentanaDeAjuste
    v-model="ajuste.edicion.value"
    :resumen="resumenDeAjuste(ajuste.edicion.value, ficha)"
    :tope="ficha.topeDiferenciaMenor"
    :errores="ajuste.errores.value"
    :enviando="ajuste.enviando.value"
    @cerrar="ajuste.cerrar"
    @guardar="ajuste.ajustar"
  />
  <VentanaDeMotivo
    v-model="quitar.edicion.value"
    titulo="Quitar la aplicación"
    texto-del-boton="Quitar la aplicación"
    :errores="quitar.errores.value"
    :enviando="quitar.enviando.value"
    @cerrar="quitar.cerrar"
    @guardar="quitar.confirmar"
  />
  <VentanaDeMotivo
    v-model="anularAjuste.edicion.value"
    titulo="Anular el ajuste"
    texto-del-boton="Anular el ajuste"
    :errores="anularAjuste.errores.value"
    :enviando="anularAjuste.enviando.value"
    @cerrar="anularAjuste.cerrar"
    @guardar="anularAjuste.confirmar"
  />
</template>
