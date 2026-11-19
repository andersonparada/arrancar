<script setup lang="ts">
import { computed } from 'vue';
import { escalaParaAncho, PIXELES_POR_MM } from '../../composables/formatos-de-cheque/estilos-de-impresion-de-cheque';
import { usarAnchoDisponible } from '../../composables/formatos-de-cheque/usar-papel-impreso';

/**
 * Muestra su contenido (una hoja de `anchoMm` × `altoMm` milímetros) achicado para que quepa en el ancho de la pantalla,
 * sin desplazamiento horizontal en el celular. Al imprimir se quita la escala: sale a tamaño real.
 */
const props = defineProps<{ anchoMm: number; altoMm: number }>();
const { elemento, ancho } = usarAnchoDisponible();

const escala = computed(() => (ancho.value > 0 ? escalaParaAncho(props.anchoMm, ancho.value, 1) : 1));
const variables = computed(() => ({
  '--escala': String(escala.value),
  '--ancho-visible': `${props.anchoMm * PIXELES_POR_MM * escala.value}px`,
  '--alto-visible': `${props.altoMm * PIXELES_POR_MM * escala.value}px`,
}));
</script>

<template>
  <div ref="elemento" class="w-full print:w-auto">
    <div
      class="h-(--alto-visible) w-(--ancho-visible) print:h-auto print:w-auto"
      :style="variables"
      data-prueba="vista-a-escala"
    >
      <div class="origin-top-left scale-(--escala) print:scale-100"><slot /></div>
    </div>
  </div>
</template>
