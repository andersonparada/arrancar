<script setup lang="ts">
import type { AccionesDeFicha } from '../../composables/activos/usar-acciones-de-ficha';
import VentanaDeBaja from '../bajas/VentanaDeBaja.vue';
import VentanaDeResultadoDeBaja from '../bajas/VentanaDeResultadoDeBaja.vue';
import VentanaDeMotivo from '../comunes/VentanaDeMotivo.vue';
import VentanaDeEstimacion from '../mejoras/VentanaDeEstimacion.vue';
import VentanaDeMatricula from '../mejoras/VentanaDeMatricula.vue';
import VentanaDeMejora from '../mejoras/VentanaDeMejora.vue';
import VentanaDeTraslado from '../traslados/VentanaDeTraslado.vue';

/** Las ventanas de las acciones de la ficha; cada una se abre desde su composable en `acciones`. */
const props = defineProps<{
  acciones: AccionesDeFicha;
  esEdificio: boolean;
  vidaTotal: number | null;
  residual: string | null;
}>();
// Los composables no cambian durante la vida de la ficha: se toman una vez para enlazar los modelos.
const { mejoras, revisiones, traslado, anulacionDeTraslado: boleta, baja } = props.acciones;
</script>

<template>
  <VentanaDeBaja
    v-model="baja.edicion.value"
    :abierta="baja.ventanaAbierta.value"
    :errores="baja.errores.value"
    :enviando="baja.enviando.value"
    :puede-escribir-el-costo="baja.puedeEscribirElCosto()"
    @cerrar="baja.cerrar"
    @guardar="baja.registrar"
  />
  <VentanaDeResultadoDeBaja :baja="baja.resultado.value" @cerrar="baja.cerrarResultado" />
  <VentanaDeMejora
    v-model="mejoras.edicion.value"
    :abierta="mejoras.ventanaAbierta.value"
    :errores="mejoras.errores.value"
    :enviando="mejoras.enviando.value"
    :es-edificio="esEdificio"
    @cerrar="mejoras.ventanaAbierta.value = false"
    @guardar="mejoras.registrar"
    @agregar="mejoras.agregarRenglon"
    @quitar="mejoras.quitarRenglon"
    @componente="mejoras.darDeAltaComoComponente"
  />
  <VentanaDeMotivo
    v-model:motivo="mejoras.anulacion.motivo.value"
    :abierta="mejoras.anulacion.porAnular.value !== null"
    titulo="Anular mejora"
    :texto="mejoras.anulacion.texto.value"
    accion="Anular"
    :errores="mejoras.errores.value"
    :enviando="mejoras.enviando.value"
    @cerrar="mejoras.anulacion.cerrar"
    @confirmar="mejoras.anulacion.confirmar"
  />
  <VentanaDeEstimacion
    v-model="revisiones.estimacion.value"
    :abierta="revisiones.ventana.value === 'estimacion'"
    :errores="revisiones.errores.value"
    :enviando="revisiones.enviando.value"
    :vida-total="vidaTotal"
    :residual="residual"
    @cerrar="revisiones.cerrar"
    @guardar="revisiones.guardarEstimacion"
  />
  <VentanaDeMatricula
    v-model="revisiones.matricula.value"
    :abierta="revisiones.ventana.value === 'matricula'"
    :errores="revisiones.errores.value"
    :enviando="revisiones.enviando.value"
    @cerrar="revisiones.cerrar"
    @guardar="revisiones.guardarMatricula"
  />
  <VentanaDeTraslado
    v-model="traslado.edicion.value"
    :abierta="traslado.ventanaAbierta.value"
    :activos="traslado.activos.value"
    :opciones="traslado.opciones.value"
    :errores="traslado.errores.value"
    :enviando="traslado.enviando.value"
    @cerrar="traslado.cerrar"
    @guardar="traslado.trasladar"
  />
  <VentanaDeMotivo
    v-model:motivo="boleta.motivo.value"
    :abierta="boleta.boleta.value !== null"
    titulo="Anular boleta"
    :texto="boleta.texto.value"
    accion="Anular boleta"
    :errores="boleta.errores.value"
    :enviando="boleta.enviando.value"
    @cerrar="boleta.cerrar"
    @confirmar="boleta.confirmar"
  />
</template>
