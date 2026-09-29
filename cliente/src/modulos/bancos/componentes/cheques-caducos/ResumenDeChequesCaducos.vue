<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeChequesCaducos } from '../../servicios/cheques-caducos.api';

/** El total de cheques y su monto, y con qué plazo se armó el reporte. */
defineProps<{ reporte: ReporteDeChequesCaducos }>();
</script>

<template>
  <section aria-label="Resumen" class="space-y-1">
    <p class="text-lg font-semibold">
      {{ reporte.totalDeCheques }} {{ reporte.totalDeCheques === 1 ? 'cheque' : 'cheques' }} ·
      {{ formatearMonto(reporte.montoTotal) }}
    </p>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      Emitidos y sin cobrar con más de {{ reporte.mesesDeAntiguedad }}
      {{ reporte.mesesDeAntiguedad === 1 ? 'mes' : 'meses' }} (fecha anterior al
      {{ formatearFecha(reporte.fechaDeCorte) }}).
    </p>
  </section>
</template>
