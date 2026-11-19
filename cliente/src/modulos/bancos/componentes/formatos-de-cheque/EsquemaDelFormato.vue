<script setup lang="ts">
import { computed } from 'vue';
import { cajasDelFormato } from '../../composables/formatos-de-cheque/estilos-de-impresion-de-cheque';
import type { FormatoDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';
import VistaAEscala from './VistaAEscala.vue';

/**
 * El esquema del formato a escala: el papel y un rectángulo donde cae cada campo (los que no se imprimen, punteados) y
 * la zona del comprobante. Se mueve al editar las medidas; la prueba de alineación es la que dibuja los textos reales.
 */
const props = defineProps<{ formato: FormatoDeCheque }>();
const cajas = computed(() => cajasDelFormato(props.formato));
</script>

<template>
  <VistaAEscala :ancho-mm="formato.papel.anchoMm" :alto-mm="formato.papel.altoMm">
    <div
      class="relative overflow-hidden bg-white ring-1 ring-tierra-400"
      :style="{ width: `${formato.papel.anchoMm}mm`, height: `${formato.papel.altoMm}mm` }"
      role="img"
      :aria-label="`Esquema del papel de ${formato.papel.anchoMm} por ${formato.papel.altoMm} milímetros con ${cajas.length} campos`"
    >
      <div
        v-if="formato.comprobante"
        class="absolute inset-x-0 border-y border-dashed border-tierra-500 bg-tierra-100 text-center text-[3mm] text-tierra-600"
        :style="{ top: `${formato.comprobante.yMm}mm`, height: `${formato.comprobante.altoMm}mm` }"
      >
        Comprobante de egreso
      </div>
      <div
        v-for="caja in cajas"
        :key="caja.clave"
        class="absolute overflow-hidden border text-[2.4mm] leading-none whitespace-nowrap"
        :class="
          caja.visible
            ? 'border-campo-700 bg-campo-200/70 text-campo-900'
            : 'border-dashed border-tierra-400 bg-transparent text-tierra-400'
        "
        :style="{ left: `${caja.xMm}mm`, top: `${caja.yMm}mm`, width: `${caja.anchoMm}mm`, height: `${caja.altoMm}mm` }"
        :title="caja.etiqueta"
      >
        {{ caja.etiqueta }}
      </div>
    </div>
  </VistaAEscala>
</template>
