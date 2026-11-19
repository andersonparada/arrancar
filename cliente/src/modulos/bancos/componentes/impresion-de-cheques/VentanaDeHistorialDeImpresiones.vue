<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFechaHora, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { ImpresionRegistrada } from '../../servicios/tipos-de-impresion-de-cheques';

/** La historia de impresiones de un cheque: la original y cada reimpresión, con quién, cuándo y por qué. */
defineProps<{ titulo: string | null; impresiones: ImpresionRegistrada[]; cargando: boolean }>();
const emit = defineEmits<{ cerrar: [] }>();
</script>

<template>
  <VentanaModal :abierta="titulo !== null" :titulo="`Impresiones del ${titulo ?? ''}`" @cerrar="emit('cerrar')">
    <p v-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <p v-else-if="!impresiones.length" class="text-sm text-tierra-600 dark:text-tierra-300">Todavía no se imprimió.</p>
    <ol v-else class="space-y-3">
      <li
        v-for="impresion in impresiones"
        :key="impresion.id"
        class="rounded-lg p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
      >
        <p class="text-sm font-semibold">
          {{ impresion.tipo === 'original' ? 'Impresión original' : 'Reimpresión' }}
          <span class="font-normal text-tierra-600 dark:text-tierra-300">
            · {{ impresion.conCheque ? 'cheque y comprobante' : 'solo el comprobante' }}
          </span>
        </p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ formatearFechaHora(impresion.impresoEn) }} · {{ formatearTexto(impresion.impresoPorNombre) }}
        </p>
        <p v-if="impresion.motivo" class="mt-1 text-sm">Motivo: {{ impresion.motivo }}</p>
        <p v-if="impresion.loteId" class="text-xs text-tierra-500">Impreso en lote.</p>
      </li>
    </ol>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
    </template>
  </VentanaModal>
</template>
