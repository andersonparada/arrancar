<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeVale } from '../composables/comprobantes/edicion-de-vale';
import type { ConceptoParaElVale } from '../servicios/catalogos.api';

/** Los gastos sin factura que justifican un vale provisional: se agregan aquí y se registran al liquidar. */
const props = defineProps<{ gastos: readonly EdicionDeVale[]; conceptos: readonly ConceptoParaElVale[] }>();
const emit = defineEmits<{ agregar: []; quitar: [indice: number] }>();

const concepto = (gasto: EdicionDeVale): string =>
  props.conceptos.find(({ id }) => id === gasto.conceptoDeGastoId)?.nombre ?? '';
</script>

<template>
  <section aria-labelledby="titulo-de-gastos" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="titulo-de-gastos" class="text-lg font-semibold">Gastos sin factura</h2>
      <BotonBase variante="secundario" :icono="Plus" @click="emit('agregar')">Agregar gasto</BotonBase>
    </div>
    <p v-if="gastos.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      Si parte del dinero se gastó sin factura (pasajes, propinas, compras pequeñas), agréguelo aquí con el motivo.
    </p>
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="(gasto, indice) in gastos" :key="indice">
        <TarjetaBase class="flex items-start justify-between gap-3">
          <div class="min-w-0 text-sm">
            <p class="truncate font-semibold">{{ gasto.descripcion }}</p>
            <p class="text-tierra-600 dark:text-tierra-300">Pagado a {{ gasto.pagadoA }} · {{ concepto(gasto) }}</p>
            <p class="text-tierra-600 dark:text-tierra-300">Sin factura: {{ gasto.motivoSinDocumento }}</p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-2">
            <span class="font-semibold tabular-nums">{{ formatearMonto(String(gasto.monto ?? '')) }}</span>
            <BotonBase
              variante="fantasma"
              pequeno
              :icono="Trash2"
              :aria-label="`Quitar el gasto ${gasto.descripcion}`"
              @click="emit('quitar', indice)"
            >
              Quitar
            </BotonBase>
          </div>
        </TarjetaBase>
      </li>
    </ul>
  </section>
</template>
