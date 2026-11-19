<script setup lang="ts">
import type { AccionesDelFondoEnVista } from '../composables/fondos/usar-acciones-del-fondo';
import type { AccionesDeMovimientosEnVista } from '../composables/movimientos/usar-acciones-de-movimientos';
import type { Fondo } from '../servicios/tipos-de-fondos';
import VentanaDeCierre from './VentanaDeCierre.vue';
import VentanaDeEntregaDeVale from './VentanaDeEntregaDeVale.vue';
import VentanaDeMotivo from './VentanaDeMotivo.vue';

/** Las ventanas de entregar un vale, cerrar el fondo y anular una reposición, un arqueo o un vale. */
defineProps<{ fondo: Fondo; acciones: AccionesDelFondoEnVista; movimientos: AccionesDeMovimientosEnVista }>();
</script>

<template>
  <VentanaDeEntregaDeVale
    :model-value="movimientos.entregaDeVale.edicion"
    :abierta="movimientos.entregaDeVale.abierta"
    :enviando="movimientos.entregaDeVale.enviando"
    :errores="movimientos.entregaDeVale.errores"
    :usuarios="acciones.catalogos.usuarios"
    :fondo="fondo"
    @cerrar="movimientos.entregaDeVale.cerrar"
    @guardar="movimientos.entregaDeVale.guardar"
  />
  <VentanaDeCierre
    :model-value="movimientos.cierre.edicion"
    :abierta="movimientos.cierre.abierta"
    :enviando="movimientos.cierre.enviando"
    :cargando="acciones.catalogos.cargando"
    :errores="movimientos.cierre.errores"
    :cuentas="acciones.catalogos.cuentas"
    :fondo="fondo"
    @cerrar="movimientos.cierre.cerrar"
    @guardar="movimientos.cierre.guardar"
  />
  <VentanaDeMotivo
    v-if="movimientos.anulacion.textos"
    :model-value="movimientos.anulacion.edicion"
    :abierta="movimientos.anulacion.abierta"
    :titulo="movimientos.anulacion.textos.titulo"
    :resumen="movimientos.anulacion.textos.resumen"
    :texto-del-boton="movimientos.anulacion.textos.textoDelBoton"
    :con-fecha="movimientos.anulacion.textos.conFecha"
    :enviando="movimientos.anulacion.enviando"
    :errores="movimientos.anulacion.errores"
    @cerrar="movimientos.anulacion.cerrar"
    @guardar="movimientos.anulacion.guardar"
  />
</template>
