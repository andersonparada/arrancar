<script setup lang="ts">
import { computed } from 'vue';
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';

/**
 * Excel (si tiene permiso de exportar) e imprimir; un reporte nunca importa. `recurso` es el grupo de reportes
 * (`reportes-de-saldos` por omisión, `reportes-de-pagos` o `reportes-de-control`).
 */
const props = withDefaults(defineProps<{ recurso?: string }>(), { recurso: 'reportes-de-saldos' });
defineEmits<{ exportar: []; imprimir: [] }>();
const permisos = computed(() => ({ exportar: `cuentas-por-pagar.${props.recurso}.exportar` }));
</script>

<template>
  <AccionesDeIntercambio :permisos="permisos" @exportar="$emit('exportar')" />
  <BotonBase variante="secundario" :icono="Printer" @click="$emit('imprimir')">Imprimir</BotonBase>
</template>
