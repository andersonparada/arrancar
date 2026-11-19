<script setup lang="ts">
import { Pencil, Plus, Scissors, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';
import {
  AYUDA_DE_CONCILIACIONES,
  AYUDA_DEL_CUADRE,
  AYUDA_DEL_SALDO_GLOBAL,
  CUENTA_SIN_SALDO,
} from '../../textos-de-apertura';
import CuadreDeLaCuenta from './CuadreDeLaCuenta.vue';

/**
 * El cuadre grande de la cuenta y las acciones sobre su cabecera: registrar, corregir, separar el saldo «de antes» en
 * partidas o eliminar. Solo aparecen las que el servidor permite (`puedeEditar`, `puedeEliminar`) y el usuario puede.
 */
defineProps<{ saldo: SaldoInicialDeCuenta }>();
const emit = defineEmits<{ registrar: []; corregir: []; separar: []; eliminar: [] }>();
</script>

<template>
  <TarjetaBase class="space-y-4">
    <template v-if="saldo.forma === 'sin_saldo'">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ CUENTA_SIN_SALDO }}</p>
      <span v-if="saldo.puedeEditar" v-permiso="'bancos.saldos-iniciales.crear'" class="contents">
        <BotonBase :icono="Plus" @click="emit('registrar')">Registrar saldo inicial</BotonBase>
      </span>
    </template>
    <template v-else>
      <CuadreDeLaCuenta :cuenta="saldo" grande />
      <p v-if="saldo.observaciones" class="text-sm break-words text-tierra-600 dark:text-tierra-300">
        {{ saldo.observaciones }}
      </p>
      <p class="text-xs text-tierra-500">{{ AYUDA_DEL_CUADRE }}</p>
      <p v-if="saldo.tieneConciliaciones" class="text-xs text-tierra-500">{{ AYUDA_DE_CONCILIACIONES }}</p>
      <p
        v-if="saldo.forma === 'global'"
        class="rounded-lg bg-trigo-300/40 p-2.5 text-sm dark:bg-trigo-500/20"
        role="note"
      >
        {{ AYUDA_DEL_SALDO_GLOBAL }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          v-if="saldo.puedeEditar && saldo.forma === 'global'"
          v-permiso="'bancos.saldos-iniciales.editar'"
          class="contents"
        >
          <BotonBase :icono="Scissors" @click="emit('separar')">Separar en partidas</BotonBase>
        </span>
        <span v-else-if="saldo.puedeEditar" v-permiso="'bancos.saldos-iniciales.editar'" class="contents">
          <BotonBase variante="secundario" :icono="Pencil" @click="emit('corregir')">Corregir saldo</BotonBase>
        </span>
        <span v-if="saldo.puedeEliminar" v-permiso="'bancos.saldos-iniciales.eliminar'" class="contents">
          <BotonBase variante="fantasma" :icono="Trash2" @click="emit('eliminar')">Eliminar saldo inicial</BotonBase>
        </span>
      </div>
    </template>
  </TarjetaBase>
</template>
