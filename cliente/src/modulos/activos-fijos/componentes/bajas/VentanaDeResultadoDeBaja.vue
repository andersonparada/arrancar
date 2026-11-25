<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { ORIGENES_DEL_COSTO_FISCAL } from '../../composables/bajas/edicion-de-baja';
import type { Baja } from '../../servicios/bajas.api';

/** Lo que quedó al dar de baja: el número del acta, el resultado de la venta y los avisos fiscales para leerlos. */
const props = defineProps<{ baja: Baja | null }>();
const emit = defineEmits<{ cerrar: [] }>();
const origen = computed(() =>
  props.baja?.origenDelCostoFiscal ? ORIGENES_DEL_COSTO_FISCAL[props.baja.origenDelCostoFiscal] : null,
);
</script>

<template>
  <VentanaModal :abierta="baja !== null" titulo="Baja registrada" @cerrar="emit('cerrar')">
    <div v-if="baja" class="space-y-4 text-sm">
      <p>Acta {{ baja.anioDeNumero }}-{{ String(baja.numero).padStart(4, '0') }} registrada.</p>
      <dl v-if="baja.precio !== null" class="grid grid-cols-2 gap-2 rounded-xl bg-tierra-100 p-3 dark:bg-tierra-800">
        <dt>Precio sin IVA</dt>
        <dd class="text-right">{{ formatearMonto(baja.precio) }}</dd>
        <dt>Resultado contable</dt>
        <dd class="text-right">{{ formatearMonto(baja.resultadoContable ?? '0') }}</dd>
        <dt>Costo fiscal</dt>
        <dd class="text-right">{{ formatearMonto(baja.costoFiscal) }}</dd>
        <dt>Resultado fiscal</dt>
        <dd class="text-right">{{ formatearMonto(baja.resultadoFiscal ?? '0') }}</dd>
      </dl>
      <p v-if="origen" class="text-tierra-600 dark:text-tierra-300">Costo fiscal: {{ origen }}.</p>
      <section v-if="baja.avisos.length > 0" aria-label="Avisos" class="space-y-2">
        <h3 class="font-medium">Tenga en cuenta</h3>
        <ul class="space-y-2">
          <li
            v-for="aviso in baja.avisos"
            :key="aviso.codigo"
            class="rounded-xl bg-trigo-300/30 p-3 ring-1 ring-trigo-500/40 dark:bg-trigo-500/10"
          >
            {{ aviso.mensaje }}
          </li>
        </ul>
      </section>
    </div>
    <template #pie>
      <BotonBase @click="emit('cerrar')">Entendido</BotonBase>
    </template>
  </VentanaModal>
</template>
