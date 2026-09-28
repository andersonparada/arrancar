<script setup lang="ts">
import { computed } from 'vue';
import { Download, Upload } from 'lucide-vue-next';
import BotonBase from '../BotonBase.vue';

/**
 * Exportar e importar en Excel: cada botón solo aparece con su permiso. Sin
 * `exportar` no hay botón de exportar (operación no las trae: lo registrado se
 * consulta en los reportes); sin `importar` no hay botón de importar (reportes
 * solo exporta: se consulta e imprime, no se carga). Con `nombre` (p. ej.
 * "saldos iniciales") los botones dicen "Exportar saldos iniciales"; sin él, se
 * ven igual que siempre.
 */
const props = defineProps<{ permisos: { importar?: string; exportar?: string }; nombre?: string }>();
const emit = defineEmits<{ exportar: []; importar: [] }>();

const textoExportar = computed(() => (props.nombre ? `Exportar ${props.nombre}` : 'Exportar'));
const textoImportar = computed(() => (props.nombre ? `Importar ${props.nombre}` : 'Importar'));
</script>

<template>
  <BotonBase
    v-if="permisos.exportar"
    v-permiso="permisos.exportar"
    variante="secundario"
    :icono="Download"
    @click="emit('exportar')"
  >
    {{ textoExportar }}
  </BotonBase>
  <BotonBase
    v-if="permisos.importar"
    v-permiso="permisos.importar"
    variante="secundario"
    :icono="Upload"
    @click="emit('importar')"
  >
    {{ textoImportar }}
  </BotonBase>
</template>
