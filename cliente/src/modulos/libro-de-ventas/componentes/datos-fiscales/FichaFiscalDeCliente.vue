<script setup lang="ts">
import { computed } from 'vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDeCliente, fiscalesDeClienteDesde } from '../../composables/datos-fiscales/datos-fiscales-de-cliente';
import { usarFichaFiscalDeCliente } from '../../composables/datos-fiscales/usar-datos-fiscales-de-cliente';
import { TEXTOS_FISCALES_DE_CLIENTE as T } from '../../textos-fiscales-de-cliente';

/** Datos fiscales del cliente para vender, solo lectura. */
const props = defineProps<{ registroId: string }>();
const { datos, cargando } = usarFichaFiscalDeCliente(() => props.registroId);
const detalles = computed(() => (datos.value ? detallesDeCliente(fiscalesDeClienteDesde(datos.value)) : []));
</script>

<template>
  <p v-if="cargando && !datos" class="text-sm text-tierra-500" role="status">Cargando datos fiscales…</p>
  <template v-else-if="datos">
    <DatosDelRegistro :detalles="detalles" />
    <p v-if="!datos.guardado" class="mt-2 text-xs text-tierra-500">{{ T.sinDatosGuardados }}</p>
  </template>
</template>
