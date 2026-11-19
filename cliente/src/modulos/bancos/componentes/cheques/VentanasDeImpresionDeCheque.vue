<script setup lang="ts">
import type { ImpresionDeUnCheque } from '../../composables/impresion-de-cheques/usar-impresion-de-un-cheque';
import VentanaDeHistorialDeImpresiones from '../impresion-de-cheques/VentanaDeHistorialDeImpresiones.vue';
import VentanaDeReimpresion from '../impresion-de-cheques/VentanaDeReimpresion.vue';
import VentanaDeCambioDeFormulario from './VentanaDeCambioDeFormulario.vue';

/** Las tres ventanas del papel de un cheque (reimprimir, historia de impresiones y pasar a otro formulario). */
defineProps<{ impresion: ImpresionDeUnCheque }>();
</script>

<template>
  <VentanaDeReimpresion
    :model-value="impresion.reimpresion.edicion"
    :errores="impresion.reimpresion.errores"
    :enviando="impresion.reimpresion.enviando"
    @cerrar="impresion.reimpresion.cerrar"
    @confirmar="impresion.reimpresion.confirmar"
  />
  <VentanaDeHistorialDeImpresiones
    :titulo="impresion.historial.titulo"
    :impresiones="impresion.historial.impresiones"
    :cargando="impresion.historial.cargando"
    @cerrar="impresion.historial.cerrar"
  />
  <VentanaDeCambioDeFormulario
    :model-value="impresion.cambio.edicion"
    :errores="impresion.cambio.errores"
    :enviando="impresion.cambio.enviando"
    :opciones="impresion.cambio.opciones"
    @cerrar="impresion.cambio.cerrar"
    @confirmar="impresion.cambio.confirmar"
  />
</template>
