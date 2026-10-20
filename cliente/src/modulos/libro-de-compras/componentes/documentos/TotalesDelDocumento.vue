<script setup lang="ts">
import { computed } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { totalRetenido } from '../../composables/documentos/detalles-de-documento';
import type { FichaDeDocumento } from '../../servicios/documentos.api';

/** Sirve para la ficha y para la vista previa del formulario: solo necesita los totales, las retenciones y el neto. */
const props = defineProps<{ ficha: Pick<FichaDeDocumento, 'totales' | 'retenciones' | 'netoAPagar'> }>();
const cifras = computed(() => {
  const { totales, retenciones } = props.ficha;
  return [
    { etiqueta: 'Total', valor: totales.total },
    { etiqueta: 'Base (sin IVA)', valor: totales.base },
    { etiqueta: 'IVA', valor: totales.iva },
    { etiqueta: 'IVA no acreditable', valor: totales.ivaNoAcreditable },
    { etiqueta: 'IDP', valor: totales.idp },
    { etiqueta: 'Exento', valor: totales.exento },
    ...(Number(totales.otrosImpuestos) === 0 ? [] : [{ etiqueta: 'Otros impuestos', valor: totales.otrosImpuestos }]),
    { etiqueta: 'Retenido', valor: totalRetenido({ retenciones }) },
  ];
});
</script>

<template>
  <TarjetaBase>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="cifra in cifras" :key="cifra.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
        <dd class="mt-0.5 tabular-nums">{{ formatearMonto(cifra.valor) }}</dd>
      </div>
      <div class="col-span-2 min-w-0 rounded-lg bg-campo-100 p-2 sm:col-span-1 dark:bg-campo-900">
        <dt class="text-xs text-campo-800 dark:text-campo-200">Neto a pagar</dt>
        <dd class="mt-0.5 text-base font-semibold tabular-nums">{{ formatearMonto(ficha.netoAPagar) }}</dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
