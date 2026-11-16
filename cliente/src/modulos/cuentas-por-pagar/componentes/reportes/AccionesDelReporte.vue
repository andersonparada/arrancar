<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'cuentas-por-pagar.reportes-de-saldos.exportar' };

/** Excel (si tiene permiso de exportar) e imprimir; un reporte nunca importa. */
defineEmits<{ exportar: []; imprimir: [] }>();
</script>

<template>
  <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="$emit('exportar')" />
  <BotonBase variante="secundario" :icono="Printer" @click="$emit('imprimir')">Imprimir</BotonBase>
</template>
