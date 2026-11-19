<script setup lang="ts">
import { estiloDeLaHoja, estiloDelCampo } from '../../composables/formatos-de-cheque/estilos-de-impresion-de-cheque';
import type { ChequeArmado } from '../../servicios/tipos-de-formatos-de-cheque';

/**
 * La cara del cheque a su medida real en milímetros: cada texto va en su lugar con letra monoespaciada, negro sobre
 * blanco (también en modo oscuro). El servidor ya armó los textos con su relleno: aquí solo se dibujan. El contenido
 * extra (la regla de la prueba, el comprobante) va en el slot y comparte el mismo origen.
 */
defineProps<{ cheque: ChequeArmado; rotulo: string }>();
</script>

<template>
  <div
    class="relative shrink-0 overflow-hidden bg-white text-black ring-1 ring-tierra-400 print:h-(--alto-impresion) print:ring-0"
    :style="estiloDeLaHoja(cheque.papel)"
    role="group"
    :aria-label="rotulo"
  >
    <span
      v-for="campo in cheque.campos"
      :key="campo.clave"
      class="absolute block overflow-visible whitespace-pre"
      :style="estiloDelCampo(campo, cheque.desplazamiento)"
      >{{ campo.texto }}</span
    >
    <slot />
  </div>
</template>
