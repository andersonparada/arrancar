<script setup lang="ts">
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { avisoDeNotasPosteriores } from '../../composables/notas-del-sistema-anterior';
import { detallesDeSaldo, tituloDeSaldo } from '../../composables/saldos-iniciales/detalles-de-saldo-inicial';
import AvisoDeNotasPosteriores from './AvisoDeNotasPosteriores.vue';
import type { SaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';

/**
 * Un saldo inicial en la lista. Corregir y eliminar aparecen solo si el servidor dice que se puede
 * (`puedeCorregir`, `puedeEliminar`) y el usuario tiene el permiso; un saldo autorizado lo dice con su etiqueta.
 */
defineProps<{ saldo: SaldoInicial }>();
defineEmits<{ corregir: []; eliminar: [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeSaldo(saldo)"
    :detalles="detallesDeSaldo(saldo)"
    permiso="cuentas-por-pagar.saldos-iniciales.editar"
    permiso-eliminar="cuentas-por-pagar.saldos-iniciales.eliminar"
    :insignia="saldo.estado === 'autorizado' ? 'Autorizado' : undefined"
    :eliminable="saldo.puedeEliminar"
    :sin-editar="!saldo.puedeCorregir && !saldo.puedeEliminar"
    @editar="$emit('corregir')"
    @eliminar="$emit('eliminar')"
  >
    <template #destacado>
      <p class="truncate text-sm text-tierra-600 dark:text-tierra-300">{{ saldo.proveedorNombre }}</p>
      <AvisoDeNotasPosteriores class="mt-2" :texto="avisoDeNotasPosteriores(saldo.notasPosteriores)" />
    </template>
  </TarjetaDeRegistro>
</template>
