<script setup lang="ts">
import { computed } from 'vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDeEmpresa } from '../composables/datos-fiscales-de-empresa';
import { usarHistorialFiscalDeEmpresa } from '../composables/usar-historial-fiscal';
import { TEXTOS_DE_HISTORIAL as T } from '../textos';
import HistorialFiscalDeEmpresa from './HistorialFiscalDeEmpresa.vue';

/** Datos fiscales de la empresa para el libro de compras y su historial de vigencias. */
const props = defineProps<{ registroId: string }>();
const { datos, cargando, quitando, quitar } = usarHistorialFiscalDeEmpresa(() => props.registroId);
const detalles = computed(() => (datos.value ? detallesDeEmpresa(datos.value) : []));
</script>

<template>
  <p v-if="cargando && !datos" class="text-sm text-tierra-500" role="status">Cargando datos fiscales…</p>
  <div v-else-if="datos" class="space-y-4">
    <p v-if="!datos.guardado" class="text-sm text-tierra-500">{{ T.vacio }}</p>
    <template v-else>
      <DatosDelRegistro :detalles="detalles" />
      <HistorialFiscalDeEmpresa :historial="datos.historial" :quitando="quitando" @quitar="quitar" />
    </template>
  </div>
</template>
