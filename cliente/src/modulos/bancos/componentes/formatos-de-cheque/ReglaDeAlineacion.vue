<script setup lang="ts">
import { computed } from 'vue';
import { marcasDeRegla } from '../../composables/formatos-de-cheque/estilos-de-impresion-de-cheque';
import type { ChequeArmado } from '../../servicios/tipos-de-formatos-de-cheque';

/**
 * Lo que se agrega a la hoja de prueba: una regla en milímetros en el borde de arriba y en el de la izquierda, y una cruz
 * en el origen (donde queda la esquina del formato con el desplazamiento aplicado). Se pone la hoja sobre el cheque
 * contra la luz para ver cuánto hay que mover cada campo.
 */
const props = defineProps<{
  papel: ChequeArmado['papel'];
  desplazamiento: ChequeArmado['desplazamiento'];
  separacionMm: number;
}>();

const horizontales = computed(() => marcasDeRegla(props.papel.anchoMm, props.separacionMm));
const verticales = computed(() => marcasDeRegla(props.papel.altoMm, props.separacionMm));
const rotulo = 'absolute text-[6pt] leading-none text-black';
</script>

<template>
  <div class="pointer-events-none absolute inset-0 text-black" aria-hidden="true">
    <template v-for="marca in horizontales" :key="`h${marca.mm}`">
      <span class="absolute top-0 h-[3mm] w-px bg-black" :style="{ left: `${marca.mm}mm` }" />
      <span :class="rotulo" :style="{ left: `${marca.mm + 0.5}mm`, top: '3.2mm' }">{{ marca.etiqueta }}</span>
    </template>
    <template v-for="marca in verticales" :key="`v${marca.mm}`">
      <span class="absolute left-0 h-px w-[3mm] bg-black" :style="{ top: `${marca.mm}mm` }" />
      <span :class="rotulo" :style="{ top: `${marca.mm + 0.5}mm`, left: '3.2mm' }">{{
        marca.mm > 0 ? marca.etiqueta : ''
      }}</span>
    </template>
    <span
      class="absolute h-[8mm] w-[8mm] -translate-x-1/2 -translate-y-1/2"
      :style="{ left: `${desplazamiento.xMm}mm`, top: `${desplazamiento.yMm}mm` }"
    >
      <span class="absolute top-1/2 left-0 h-px w-full bg-black" />
      <span class="absolute top-0 left-1/2 h-full w-px bg-black" />
    </span>
    <span :class="rotulo" class="right-[2mm] bottom-[2mm]">mm</span>
  </div>
</template>
