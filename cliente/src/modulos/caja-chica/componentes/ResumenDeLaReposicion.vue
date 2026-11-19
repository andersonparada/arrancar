<script setup lang="ts">
import { computed } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ResumenDeReposicion } from '../composables/reposiciones/edicion-de-reposicion';
import type { DesgloseDeReposicion } from '../servicios/tipos-de-reposiciones';

/**
 * Lo que va a pasar al reponer: cuánto y de cuántos comprobantes. Si se repone todo lo pendiente se ve el reparto por
 * concepto que Bancos recibirá; con una selección parcial el servidor lo calcula al registrar.
 */
const props = defineProps<{ resumen: ResumenDeReposicion; desglose: DesgloseDeReposicion | null }>();

const sinNada = computed(() => props.resumen.cantidad === 0 || Number(props.resumen.total) <= 0);
const partes = computed(() =>
  props.desglose && props.resumen.esTodo
    ? [
        { etiqueta: 'Gasto de operación', valor: props.desglose.operacion },
        { etiqueta: 'Compra de activo fijo', valor: props.desglose.activo },
        { etiqueta: 'Faltante de efectivo', valor: props.desglose.faltante },
      ].filter(({ valor }) => Number(valor) !== 0)
    : [],
);
</script>

<template>
  <TarjetaBase class="space-y-3" aria-live="polite">
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      {{ resumen.cantidad === 1 ? '1 comprobante' : `${resumen.cantidad} comprobantes` }} a reponer
    </p>
    <p class="text-3xl font-semibold tabular-nums">{{ formatearMonto(resumen.total) }}</p>
    <p v-if="sinNada" class="text-sm text-red-700 dark:text-red-400" role="alert">
      No hay nada que reponer: la suma de lo elegido tiene que ser mayor que cero. Marque más comprobantes.
    </p>
    <p v-if="resumen.notasDeCredito + resumen.sobrantes > 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      Incluye {{ resumen.notasDeCredito + resumen.sobrantes }} que restan (notas de crédito o sobrantes).
    </p>
    <p v-if="resumen.faltantes > 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      Incluye {{ resumen.faltantes }} faltante{{ resumen.faltantes === 1 ? '' : 's' }} de efectivo.
    </p>
    <dl v-if="partes.length > 0" class="space-y-1 border-t border-tierra-200 pt-3 text-sm dark:border-tierra-700">
      <div v-for="parte in partes" :key="parte.etiqueta" class="flex justify-between gap-3">
        <dt>{{ parte.etiqueta }}</dt>
        <dd class="tabular-nums">{{ formatearMonto(parte.valor) }}</dd>
      </div>
    </dl>
    <p v-else-if="desglose && resumen.cantidad > 0" class="text-xs text-tierra-500">
      El reparto por concepto lo calcula el servidor con lo que escogió.
    </p>
  </TarjetaBase>
</template>
