<script setup lang="ts">
import type { FilaDeCuenta } from '../composables/arbol-de-cuentas';
import { admiteSubcuentas } from '../composables/edicion-de-cuenta';
import type { Cuenta } from '../servicios/cuentas.api';
import FilaDeCuentaDelArbol from './FilaDeCuenta.vue';

defineProps<{ filas: FilaDeCuenta[]; mascara: string; puedeEditar: boolean; puedeCrear: boolean }>();
const emit = defineEmits<{ alternar: [id: string]; editar: [cuenta: Cuenta]; agregar: [cuenta: Cuenta] }>();
</script>

<template>
  <ul class="divide-y divide-tierra-100 dark:divide-tierra-800" aria-label="Cuentas de la nomenclatura">
    <FilaDeCuentaDelArbol
      v-for="fila in filas"
      :key="fila.cuenta.id"
      :fila="fila"
      :puede-editar="puedeEditar"
      :puede-crear="puedeCrear"
      :admite-subcuentas="admiteSubcuentas(fila.cuenta, mascara)"
      @alternar="emit('alternar', fila.cuenta.id)"
      @editar="emit('editar', fila.cuenta)"
      @agregar="emit('agregar', fila.cuenta)"
    />
  </ul>
</template>
