<script setup lang="ts">
import type { AccionesDeComprobantesEnVista } from '../composables/comprobantes/usar-acciones-de-comprobantes';
import { resumenDeLaBaja } from '../composables/comprobantes/usar-baja-de-comprobante';
import type { AccionesDelFondoEnVista } from '../composables/fondos/usar-acciones-del-fondo';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Fondo } from '../servicios/tipos-de-fondos';
import VentanaDeAsignacion from './VentanaDeAsignacion.vue';
import VentanaDeAumento from './VentanaDeAumento.vue';
import VentanaDeCustodio from './VentanaDeCustodio.vue';
import VentanaDeEdicionDelFondo from './VentanaDeEdicionDelFondo.vue';
import VentanaDeDisminucion from './VentanaDeDisminucion.vue';
import VentanaDeMotivo from './VentanaDeMotivo.vue';
import VentanaDeValeDeGasto from './VentanaDeValeDeGasto.vue';

/** Todas las ventanas de la ficha de un fondo, juntas para que la página solo arme. */
defineProps<{
  fondo: Fondo;
  acciones: AccionesDelFondoEnVista;
  comprobantes: AccionesDeComprobantesEnVista;
}>();
</script>

<template>
  <VentanaDeEdicionDelFondo
    :model-value="acciones.edicion.edicion"
    :abierta="acciones.edicion.abierta"
    :enviando="acciones.edicion.enviando"
    :errores="acciones.edicion.errores"
    :localidades="acciones.catalogos.localidades"
    :cuentas="acciones.catalogos.cuentas"
    :cambia-el-tope="acciones.cambiaElTope"
    @cerrar="acciones.edicion.cerrar"
    @guardar="acciones.edicion.guardar"
  />
  <VentanaDeAumento
    :model-value="acciones.aumentar.edicion"
    :abierta="acciones.aumentar.abierta"
    :enviando="acciones.aumentar.enviando"
    :cargando="acciones.catalogos.cargando"
    :errores="acciones.aumentar.errores"
    :chequeras="acciones.catalogos.chequeras"
    :cuentas="acciones.catalogos.cuentas"
    :fondo="fondo"
    @cerrar="acciones.aumentar.cerrar"
    @guardar="acciones.aumentar.guardar"
  />
  <VentanaDeDisminucion
    :model-value="acciones.disminuir.edicion"
    :abierta="acciones.disminuir.abierta"
    :enviando="acciones.disminuir.enviando"
    :errores="acciones.disminuir.errores"
    :cuentas="acciones.catalogos.cuentas"
    :fondo="fondo"
    @cerrar="acciones.disminuir.cerrar"
    @guardar="acciones.disminuir.guardar"
  />
  <VentanaDeCustodio
    :model-value="acciones.custodio.edicion"
    :abierta="acciones.custodio.abierta"
    :enviando="acciones.custodio.enviando"
    :errores="acciones.custodio.errores"
    :usuarios="acciones.catalogos.usuarios"
    :fondo="fondo"
    @cerrar="acciones.custodio.cerrar"
    @guardar="acciones.custodio.guardar"
  />
  <VentanaDeMotivo
    :model-value="acciones.anulacion.edicion"
    :abierta="acciones.anulacion.abierta"
    titulo="Anular la apertura"
    :resumen="`Se anula la apertura de «${fondo.nombre}»: el fondo queda cerrado sin haberse usado y Bancos registra el movimiento inverso de ${formatearMonto(fondo.monto)}. Solo se puede si el fondo no tiene comprobantes.`"
    texto-del-boton="Anular apertura"
    con-fecha
    :enviando="acciones.anulacion.enviando"
    :errores="acciones.anulacion.errores"
    @cerrar="acciones.anulacion.cerrar"
    @guardar="acciones.anulacion.guardar"
  />
  <VentanaDeValeDeGasto
    :model-value="comprobantes.vale.edicion"
    :abierta="comprobantes.vale.abierta"
    :enviando="comprobantes.vale.enviando"
    :errores="comprobantes.vale.errores"
    :conceptos="comprobantes.vale.conceptos"
    @cerrar="comprobantes.vale.cerrar"
    @guardar="comprobantes.vale.guardar"
  />
  <VentanaDeAsignacion
    :model-value="comprobantes.asignacion.edicion"
    :abierta="comprobantes.asignacion.abierta"
    :enviando="comprobantes.asignacion.enviando"
    :errores="comprobantes.asignacion.errores"
    :fondo="comprobantes.asignacion.destino?.nombre ?? ''"
    :resumen="comprobantes.asignacion.resumen"
    :hay-retencion="comprobantes.asignacion.hayRetencion"
    @cerrar="comprobantes.asignacion.cerrar"
    @guardar="comprobantes.asignacion.guardar"
  />
  <VentanaDeMotivo
    :model-value="comprobantes.baja.edicion"
    :abierta="comprobantes.baja.abierta"
    :titulo="comprobantes.baja.objetivo?.baja === 'devolver' ? 'Devolver a la bandeja' : 'Anular el vale de gasto'"
    :resumen="
      comprobantes.baja.objetivo
        ? resumenDeLaBaja(comprobantes.baja.objetivo.comprobante, comprobantes.baja.objetivo.baja)
        : ''
    "
    :texto-del-boton="comprobantes.baja.objetivo?.baja === 'devolver' ? 'Devolver' : 'Anular vale'"
    :enviando="comprobantes.baja.enviando"
    :errores="comprobantes.baja.errores"
    @cerrar="comprobantes.baja.cerrar"
    @guardar="comprobantes.baja.guardar"
  />
</template>
