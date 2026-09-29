<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { GrupoDeLote, LoteDeSugerencias } from '../../composables/sugerencias/lote-de-sugerencias';

/**
 * Confirmación de aceptar varias sugerencias: cuántos movimientos van a cada concepto y con cuánto dinero. Nada se
 * clasifica hasta marcar la casilla y confirmar; después no hay deshacer directo (se corrige con «Reclasificar» en
 * el reporte de Movimientos).
 */
defineProps<{ lote: LoteDeSugerencias | null; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const confirmado = defineModel<boolean>('confirmado', { required: true });

const dinero = (grupo: GrupoDeLote): string =>
  [
    Number(grupo.montoDeEntradas) ? `${formatearMonto(grupo.montoDeEntradas)} de entradas` : '',
    Number(grupo.montoDeSalidas) ? `${formatearMonto(grupo.montoDeSalidas)} de salidas` : '',
  ]
    .filter(Boolean)
    .join(' y ');
</script>

<template>
  <VentanaModal :abierta="!!lote" titulo="Aceptar lo sugerido" @cerrar="emit('cerrar')">
    <form v-if="lote" id="form-aceptar-sugerencias" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm">
        Se clasificarán <strong>{{ lote.asignaciones.length }}</strong>
        {{ lote.asignaciones.length === 1 ? 'movimiento' : 'movimientos' }}:
      </p>
      <ul class="space-y-1.5 text-sm">
        <li
          v-for="grupo in lote.grupos"
          :key="grupo.conceptoId"
          class="rounded-lg bg-tierra-50 px-3 py-2 dark:bg-tierra-900/50"
        >
          <strong>{{ grupo.cantidad }}</strong> como «{{ grupo.conceptoNombre }}»
          <span class="block text-xs text-tierra-600 dark:text-tierra-300">{{ dinero(grupo) }}</span>
        </li>
      </ul>
      <p v-if="lote.sinSugerencia" class="text-sm text-amber-700 dark:text-amber-400" role="status">
        {{ lote.sinSugerencia }} marcados no tienen concepto sugerido y no se incluyen: quedan pendientes.
      </p>
      <p class="text-xs text-tierra-600 dark:text-tierra-300">
        Solo cambia el concepto (aunque el mes esté conciliado) y queda en la auditoría como sugerencia aceptada. «Sin
        clasificar» no se vuelve a asignar: si alguno queda mal, se corrige con «Reclasificar» en el reporte de
        Movimientos.
      </p>
      <label class="flex cursor-pointer items-start gap-2 text-sm font-medium">
        <input
          v-model="confirmado"
          type="checkbox"
          class="mt-0.5 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        />
        Revisé el resumen y quiero clasificar estos movimientos.
      </label>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-aceptar-sugerencias" :deshabilitado="!confirmado" :cargando="enviando">
        Clasificar
      </BotonBase>
    </template>
  </VentanaModal>
</template>
