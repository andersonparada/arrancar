<script setup lang="ts">
import { computed } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  documentosPorTipo,
  ivaSinCreditoPorMotivo,
  lineasDeCombustibles,
} from '../../composables/libro/datos-del-libro';
import type { LibroDelPeriodo } from '../../servicios/libro.api';

const props = defineProps<{ libro: LibroDelPeriodo }>();
const resumen = computed(() => props.libro.resumen);
const sinCredito = computed(() => ivaSinCreditoPorMotivo(resumen.value));
const combustibles = computed(() => lineasDeCombustibles(resumen.value.combustibles));
const porTipo = computed(() => documentosPorTipo(resumen.value));
const clasesDelTitulo = 'text-xs font-semibold uppercase tracking-wide text-tierra-600 dark:text-tierra-300';
const clasesDeLista = 'mt-2 space-y-1 text-sm';
const clasesDeLinea = 'flex justify-between gap-3';
</script>

<template>
  <section aria-label="Resumen mensual" class="mt-6">
    <h2 class="mb-3 text-lg font-semibold">Resumen del mes</h2>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TarjetaBase v-if="libro.tipoDeLibro === 'completo'">
        <h3 :class="clasesDelTitulo">Crédito fiscal del período</h3>
        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ formatearMonto(resumen.creditoFiscalDelPeriodo) }}</p>
        <p class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">IVA de las compras con derecho a crédito.</p>
      </TarjetaBase>
      <TarjetaBase v-if="libro.tipoDeLibro === 'completo'">
        <h3 :class="clasesDelTitulo">IVA sin crédito, por motivo</h3>
        <p v-if="sinCredito.length === 0" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">
          Ninguna compra tiene IVA sin crédito este mes.
        </p>
        <ul v-else :class="clasesDeLista">
          <li v-for="linea in sinCredito" :key="linea.clave" :class="clasesDeLinea">
            <span>{{ linea.texto }}</span>
            <span class="tabular-nums">{{ formatearMonto(linea.monto) }}</span>
          </li>
        </ul>
      </TarjetaBase>
      <TarjetaBase v-if="combustibles.length">
        <h3 :class="clasesDelTitulo">Combustibles</h3>
        <ul :class="clasesDeLista">
          <li v-for="linea in combustibles" :key="linea.clave" :class="clasesDeLinea">
            <span>{{ linea.texto }}</span>
            <span class="tabular-nums">{{ formatearMonto(linea.monto) }}</span>
          </li>
        </ul>
      </TarjetaBase>
      <TarjetaBase>
        <h3 :class="clasesDelTitulo">Documentos por tipo</h3>
        <p v-if="porTipo.length === 0" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">Sin documentos.</p>
        <ul v-else :class="clasesDeLista">
          <li v-for="linea in porTipo" :key="linea.clave" :class="clasesDeLinea">
            <span>{{ linea.texto }}: {{ linea.cantidad }}</span>
            <span class="tabular-nums">{{ formatearMonto(linea.monto) }}</span>
          </li>
        </ul>
      </TarjetaBase>
    </div>
  </section>
</template>
