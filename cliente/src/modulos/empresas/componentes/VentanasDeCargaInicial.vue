<script setup lang="ts">
import type { CargaInicialEnEdicion } from '../composables/usar-carga-inicial';
import VentanaDeCierreDeCarga from './VentanaDeCierreDeCarga.vue';
import VentanaDeReapertura from './VentanaDeReapertura.vue';
import VentanaDeRevisionGuardada from './VentanaDeRevisionGuardada.vue';
import VentanaDelHistorialDeCarga from './VentanaDelHistorialDeCarga.vue';

/** Las ventanas que se abren desde la sección de la carga inicial: cerrar, reabrir, historial y revisión guardada. */
defineProps<{ estado: CargaInicialEnEdicion }>();
</script>

<template>
  <VentanaDeCierreDeCarga
    :motivo="estado.cierre.motivo"
    :abierta="estado.cierre.abierta"
    :cargando="estado.cierre.cargandoRevision"
    :revision="estado.cierre.revision"
    :fecha-de-inicio="estado.carga?.fechaDeInicio ?? null"
    :aviso-de-cambio="estado.cierre.avisoDeCambio"
    :errores="estado.cierre.errores"
    :enviando="estado.cierre.enviando"
    @update:motivo="estado.cierre.fijarMotivo"
    @cancelar="estado.cierre.cancelar()"
    @confirmar="estado.cierre.confirmar()"
  />
  <VentanaDeReapertura
    :motivo="estado.reapertura.motivo"
    :abierta="estado.reapertura.abierta"
    :errores="estado.reapertura.errores"
    :enviando="estado.reapertura.enviando"
    @update:motivo="estado.reapertura.fijarMotivo"
    @cerrar="estado.reapertura.cancelar()"
    @confirmar="estado.reapertura.reabrir()"
  />
  <VentanaDelHistorialDeCarga
    :abierta="estado.guardados.historialAbierto"
    :entradas="estado.guardados.entradas"
    :cargando="estado.guardados.cargandoHistorial"
    @cerrar="estado.guardados.cerrarHistorial()"
    @ver-revision="estado.guardados.abrirRevision($event)"
  />
  <VentanaDeRevisionGuardada
    :cierre="estado.guardados.cierre"
    :exportando="estado.guardados.exportando"
    @cerrar="estado.guardados.cerrarRevision()"
    @exportar="estado.guardados.exportar($event)"
  />
</template>
