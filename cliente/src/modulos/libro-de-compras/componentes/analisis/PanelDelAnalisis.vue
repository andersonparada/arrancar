<script setup lang="ts">
import { computed } from 'vue';
import { ReceiptText } from 'lucide-vue-next';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { estaVacio } from '../../composables/analisis/datos-del-analisis';
import type { ClaveDeAnalisis, ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { ANALISIS_DISPONIBLES, VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import TablaDeActivosFijos from './TablaDeActivosFijos.vue';
import TablaDeCombustibles from './TablaDeCombustibles.vue';
import TablaIvaAlCosto from './TablaIvaAlCosto.vue';
import TablaPorConcepto from './TablaPorConcepto.vue';
import TablaPorProveedor from './TablaPorProveedor.vue';

/** El análisis escogido: su explicación y su tabla, o un estado vacío útil si el rango no tiene compras. */
const props = defineProps<{
  analisis: ClaveDeAnalisis;
  resultados: Partial<ResultadosDelAnalisis>;
  cargando: boolean;
  bloqueado: boolean;
}>();

const ayuda = computed(() => ANALISIS_DISPONIBLES.find((a) => a.clave === props.analisis)?.ayuda ?? '');
const vacio = computed(() => {
  const datos = props.resultados[props.analisis];
  return datos ? estaVacio(props.analisis, datos as never) : false;
});
</script>

<template>
  <section
    id="panel-del-analisis"
    role="tabpanel"
    :aria-labelledby="`pestana-analisis-${analisis}`"
    :aria-busy="cargando"
    :class="{ 'opacity-60': cargando }"
  >
    <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">{{ ayuda }}</p>
    <p v-if="bloqueado" class="text-sm text-tierra-500" role="status">Corrija el rango para ver el análisis.</p>
    <p v-else-if="cargando && !resultados[analisis]" class="text-sm text-tierra-500" role="status">
      {{ textos.cargando }}
    </p>
    <EstadoVacio v-else-if="vacio" :icono="ReceiptText" :titulo="textos.vacio" :descripcion="textos.vacioAyuda" />
    <template v-else>
      <TablaPorProveedor
        v-if="analisis === 'compras-por-proveedor' && resultados['compras-por-proveedor']"
        :datos="resultados['compras-por-proveedor']"
      />
      <TablaPorConcepto
        v-else-if="analisis === 'compras-por-concepto' && resultados['compras-por-concepto']"
        :datos="resultados['compras-por-concepto']"
      />
      <TablaIvaAlCosto
        v-else-if="analisis === 'iva-al-costo' && resultados['iva-al-costo']"
        :datos="resultados['iva-al-costo']"
      />
      <TablaDeActivosFijos
        v-else-if="analisis === 'activos-fijos' && resultados['activos-fijos']"
        :datos="resultados['activos-fijos']"
      />
      <TablaDeCombustibles
        v-else-if="analisis === 'combustibles' && resultados.combustibles"
        :datos="resultados.combustibles"
      />
    </template>
  </section>
</template>
