<script setup lang="ts">
import { resumenDeAjuste } from '../composables/ajuste-de-saldo';
import type { AccionesDeNota } from '../composables/usar-acciones-de-nota';
import type { FichaDelDocumento } from '../servicios/tipos';
import VentanaDeAjuste from './VentanaDeAjuste.vue';
import VentanaDeAplicacion from './VentanaDeAplicacion.vue';
import VentanaDeMotivo from './VentanaDeMotivo.vue';
import VentanaDeReintegro from './VentanaDeReintegro.vue';

/** Las ventanas del saldo a favor de una nota: aplicar, ajustar, reintegrar, quitar una aplicación y anular un ajuste o un reintegro. */
const props = defineProps<{ ficha: FichaDelDocumento; acciones: AccionesDeNota }>();
const { aplicacion, ajuste, quitar, anularAjuste, reintegro, anularReintegro } = props.acciones;
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
  <VentanaDeReintegro
    v-model="reintegro.edicion.value"
    :resumen="reintegro.resumen.value"
    :cuentas="reintegro.cuentas.value"
    :sin-cuentas="reintegro.sinCuentas.value"
    :aviso-de-efectivo="reintegro.avisoDeEfectivo"
    :errores="reintegro.errores.value"
    :enviando="reintegro.enviando.value"
    @cerrar="reintegro.cerrar"
    @guardar="reintegro.registrar"
  />
  <VentanaDeMotivo
    v-model="anularReintegro.edicion.value"
    titulo="Anular el reintegro"
    texto-del-boton="Anular el reintegro"
    :errores="anularReintegro.errores.value"
    :enviando="anularReintegro.enviando.value"
    @cerrar="anularReintegro.cerrar"
    @guardar="anularReintegro.confirmar"
  />
</template>
