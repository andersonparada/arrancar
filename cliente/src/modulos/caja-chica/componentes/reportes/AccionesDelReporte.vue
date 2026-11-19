<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';

/** Excel (si tiene permiso de exportar) e imprimir; un reporte nunca importa. */
defineEmits<{ exportar: []; imprimir: [] }>();
const permisos = { exportar: 'caja-chica.reportes.exportar' };
</script>

<template>
  <AccionesDeIntercambio :permisos="permisos" @exportar="$emit('exportar')" />
  <BotonBase variante="secundario" :icono="Printer" @click="$emit('imprimir')">Imprimir</BotonBase>
</template>
