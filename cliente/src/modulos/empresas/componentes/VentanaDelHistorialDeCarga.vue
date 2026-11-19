<script setup lang="ts">
import { computed } from 'vue';
import { FileSearch } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { lineaDelHistorial } from '../composables/resumen-de-cierre';
import type { EntradaDelHistorial } from '../servicios/cierre-de-carga.tipos';

/** Todo lo que pasó con la carga: cierres, reaperturas y balances quitados, del más nuevo al más viejo. */
const props = defineProps<{ abierta: boolean; entradas: EntradaDelHistorial[]; cargando: boolean }>();
const emit = defineEmits<{ cerrar: []; verRevision: [cierreId: string] }>();

const lineas = computed(() => props.entradas.map(lineaDelHistorial));
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Historial de la carga inicial" encima @cerrar="emit('cerrar')">
    <p v-if="cargando" role="status" class="text-sm text-tierra-500">Cargando el historial…</p>
    <p v-else-if="lineas.length === 0" class="text-sm text-tierra-500">
      Todavía no hay cierres ni reaperturas registrados para esta carga.
    </p>
    <ol v-else class="space-y-3">
      <li
        v-for="linea in lineas"
        :key="linea.id"
        class="space-y-1 rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-semibold">{{ linea.titulo }}</h3>
          <BotonBase
            v-if="linea.conRevision"
            variante="secundario"
            pequeno
            :icono="FileSearch"
            @click="emit('verRevision', linea.id)"
          >
            Ver revisión
          </BotonBase>
        </div>
        <p class="text-xs text-tierra-500">{{ linea.cuando }}</p>
        <p v-if="linea.detalle" class="text-sm">{{ linea.detalle }}</p>
        <p v-if="linea.motivo" class="break-words text-sm">
          <span class="font-medium">Motivo:</span> {{ linea.motivo }}
        </p>
      </li>
    </ol>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
    </template>
  </VentanaModal>
</template>
