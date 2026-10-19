<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import type { FichaDeDocumento } from '../../servicios/documentos.api';
import { MOTIVOS_FUERA_DEL_LIBRO, MOTIVOS_SIN_CREDITO } from '../../textos-de-documentos';

/** Por qué el IVA va al costo y por qué el documento queda fuera de los reportes de la SAT, si aplica. */
const props = defineProps<{ ficha: Pick<FichaDeDocumento, 'motivoSinCredito' | 'motivoFueraDelLibro'> }>();
const motivos = computed(() => {
  const { motivoSinCredito, motivoFueraDelLibro } = props.ficha;
  return [
    motivoSinCredito ? MOTIVOS_SIN_CREDITO[motivoSinCredito] : null,
    motivoFueraDelLibro ? MOTIVOS_FUERA_DEL_LIBRO[motivoFueraDelLibro] : null,
  ].filter((texto): texto is string => texto !== null);
});
</script>

<template>
  <ul
    v-if="motivos.length"
    class="space-y-2 rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
  >
    <li v-for="motivo in motivos" :key="motivo" class="flex gap-2">
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ motivo }}</span>
    </li>
  </ul>
</template>
