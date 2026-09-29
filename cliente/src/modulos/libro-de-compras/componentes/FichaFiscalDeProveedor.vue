<script setup lang="ts">
import { computed } from 'vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDeProveedor, fiscalesDeProveedorDesde } from '../composables/datos-fiscales-de-proveedor';
import { usarFichaFiscalDeProveedor } from '../composables/usar-datos-fiscales';

/** Datos fiscales del proveedor para el libro de compras, solo lectura. */
const props = defineProps<{ registroId: string }>();
const { datos, cargando } = usarFichaFiscalDeProveedor(() => props.registroId);
const detalles = computed(() => (datos.value ? detallesDeProveedor(fiscalesDeProveedorDesde(datos.value)) : []));
</script>

<template>
  <p v-if="cargando && !datos" class="text-sm text-tierra-500" role="status">Cargando datos fiscales…</p>
  <template v-else-if="datos">
    <DatosDelRegistro :detalles="detalles" />
    <p v-if="!datos.guardado" class="mt-2 text-xs text-tierra-500">
      Todavía no se han guardado: se usan los valores por omisión. Edite el proveedor para definirlos.
    </p>
  </template>
</template>
