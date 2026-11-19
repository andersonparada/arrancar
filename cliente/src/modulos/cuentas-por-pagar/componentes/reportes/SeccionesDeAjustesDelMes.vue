<script setup lang="ts">
import type { ReporteDeAjustesDelMes } from '../../servicios/tipos-de-reportes-de-control';
import SeccionDelReporteDeControl from './SeccionDelReporteDeControl.vue';
import TablaDeAjustesDelMes from './TablaDeAjustesDelMes.vue';
import TablasDeControlDelMes from './TablasDeControlDelMes.vue';

/** Las seis partes de R8, cada una con su título y su cuenta de filas. */
defineProps<{ reporte: ReporteDeAjustesDelMes }>();
</script>

<template>
  <div class="space-y-6">
    <SeccionDelReporteDeControl titulo="1. Ajustes del mes" :cantidad="reporte.ajustes.length">
      <TablaDeAjustesDelMes :filas="reporte.ajustes" titulo="Ajustes del mes" />
    </SeccionDelReporteDeControl>
    <SeccionDelReporteDeControl
      titulo="2. Ajustes de otros meses anulados en este mes"
      descripcion="Cambian un mes que ya se había revisado."
      :cantidad="reporte.anulacionesDeOtrosMeses.length"
    >
      <TablaDeAjustesDelMes :filas="reporte.anulacionesDeOtrosMeses" titulo="Anulaciones de ajustes de otros meses" />
    </SeccionDelReporteDeControl>
    <SeccionDelReporteDeControl
      titulo="3. Aplicaciones manuales"
      descripcion="Compensaciones entre una nota y un cargo, sin dinero de por medio."
      :cantidad="reporte.aplicacionesManuales.length"
    >
      <TablasDeControlDelMes :aplicaciones="reporte.aplicacionesManuales" />
    </SeccionDelReporteDeControl>
    <SeccionDelReporteDeControl
      titulo="4. Pagos a la cuenta de apertura"
      descripcion="La excepción con permiso propio."
      :cantidad="reporte.pagosAApertura.length"
    >
      <TablasDeControlDelMes :pagos-a-apertura="reporte.pagosAApertura" />
    </SeccionDelReporteDeControl>
    <SeccionDelReporteDeControl
      titulo="5a. Documentos anulados"
      descripcion="Los que se anularon en el mes."
      :cantidad="reporte.documentosAnulados.length"
    >
      <TablasDeControlDelMes :documentos="reporte.documentosAnulados" />
    </SeccionDelReporteDeControl>
    <SeccionDelReporteDeControl
      titulo="5b. Documentos devueltos a revisión"
      descripcion="Los que perdieron su autorización en el mes."
      :cantidad="reporte.documentosDesautorizados.length"
    >
      <TablasDeControlDelMes :documentos="reporte.documentosDesautorizados" />
    </SeccionDelReporteDeControl>
  </div>
</template>
