<script setup lang="ts">
import { Receipt, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  detallesDelGasto,
  marcaDelGasto,
  montoDelGasto,
  resumenDeLosGastos,
  tituloDelGasto,
} from '../composables/gastos/gastos-del-anticipo';
import type { Gasto } from '../servicios/tipos-de-gastos';
import AvisosDeLaPantalla from './AvisosDeLaPantalla.vue';

/** Los gastos del anticipo, del más antiguo al más nuevo; quitar solo se ofrece si hay permiso y el anticipo está abierto. */
defineProps<{ gastos: Gasto[]; puedeQuitar: boolean }>();
defineEmits<{ quitar: [gasto: Gasto] }>();
</script>

<template>
  <div>
    <p class="mb-2 text-sm text-tierra-600 dark:text-tierra-300">{{ resumenDeLosGastos(gastos) }}</p>
    <EstadoVacio
      v-if="gastos.length === 0"
      :icono="Receipt"
      titulo="Todavía no hay gastos"
      descripcion="Agregue las facturas que el beneficiario vaya entregando, o anote un gasto sin documento. Así se ve cuánto falta por justificar."
    />
    <ul v-else class="space-y-3">
      <li v-for="gasto in gastos" :key="gasto.id">
        <TarjetaBase>
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="break-words font-medium">{{ tituloDelGasto(gasto) }}</h3>
              <InsigniaBase v-if="marcaDelGasto(gasto)" class="mt-1" tono="trigo">{{
                marcaDelGasto(gasto)
              }}</InsigniaBase>
            </div>
            <p class="shrink-0 text-lg font-semibold">{{ montoDelGasto(gasto) }}</p>
          </div>
          <dl class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div
              v-for="detalle in detallesDelGasto(gasto)"
              :key="detalle.etiqueta"
              :class="{ 'sm:col-span-2': detalle.largo }"
            >
              <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
              <dd class="break-words">{{ detalle.valor }}</dd>
            </div>
          </dl>
          <AvisosDeLaPantalla class="mt-3" :avisos="gasto.avisos" />
          <div v-if="puedeQuitar" v-permiso="'cuentas-por-liquidar.gastos.anular'" class="mt-3 flex justify-end">
            <BotonBase variante="fantasma" pequeno :icono="Trash2" @click="$emit('quitar', gasto)">Quitar</BotonBase>
          </div>
        </TarjetaBase>
      </li>
    </ul>
  </div>
</template>
