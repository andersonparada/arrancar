<script setup lang="ts">
import { ref } from 'vue';
import {
  comprobanteVaAparte,
  rotuloDeLaHoja,
  type ParteDeLaImpresion,
} from '../../composables/impresion-de-cheques/armado-de-la-impresion';
import type { ChequeParaImprimir } from '../../servicios/tipos-de-impresion-de-cheques';
import HojaDeCheque from '../formatos-de-cheque/HojaDeCheque.vue';
import VistaAEscala from '../formatos-de-cheque/VistaAEscala.vue';
import ComprobanteDeEgreso from './ComprobanteDeEgreso.vue';
import ZonaDelComprobante from './ZonaDelComprobante.vue';

/**
 * Un cheque en la pantalla de impresión: su hoja a la medida del formulario (con el comprobante dentro, si es voucher)
 * y, si no cabe en el formulario, su comprobante en hoja carta. Al imprimir solo sale la `parte` elegida; el título y los
 * avisos de esta pantalla no se imprimen.
 */
const props = defineProps<{ item: ChequeParaImprimir; parte: ParteDeLaImpresion; esUltimo: boolean }>();
const desborda = ref(false);

/** Una hoja por página, menos la última (el navegador no agrega una página en blanco al final). */
const salto = () => (props.esUltimo ? '' : 'print:break-after-page');
const ocultaSi = (parte: ParteDeLaImpresion) => (props.parte === parte ? '' : 'print:hidden');
</script>

<template>
  <section class="space-y-3 print:space-y-0" :aria-label="`Cheque ${item.serie ?? ''}${item.numero}`">
    <h2 class="text-sm font-semibold print:hidden">Cheque No. {{ item.serie ?? '' }}{{ item.numero }}</h2>
    <p
      v-if="desborda"
      class="rounded-lg bg-red-50 p-3 text-sm text-red-800 print:hidden dark:bg-red-950 dark:text-red-200"
      role="alert"
    >
      El comprobante no cabe en la zona que el formato le reserva y se cortaría al imprimir. Agrande la zona en el
      formato o quítela para que salga en hoja carta aparte.
    </p>

    <div v-if="item.cheque" :class="[ocultaSi('cheques'), salto()]">
      <VistaAEscala :ancho-mm="item.cheque.papel.anchoMm" :alto-mm="item.cheque.papel.altoMm">
        <HojaDeCheque :cheque="item.cheque" :rotulo="rotuloDeLaHoja(item, 'cheques')">
          <ZonaDelComprobante
            v-if="item.zonaDelComprobante"
            :comprobante="item.comprobante"
            :y-mm="item.zonaDelComprobante.yMm"
            :alto-mm="item.zonaDelComprobante.altoMm"
            @desborda="desborda = $event"
          />
        </HojaDeCheque>
      </VistaAEscala>
    </div>

    <div v-if="comprobanteVaAparte(item)" :class="[ocultaSi('comprobantes'), salto()]">
      <article
        class="mx-auto w-full max-w-[8.5in] bg-white p-4 text-black ring-1 ring-tierra-300 sm:p-8 print:max-w-none print:p-0 print:ring-0"
        :aria-label="rotuloDeLaHoja(item, 'comprobantes')"
      >
        <ComprobanteDeEgreso :comprobante="item.comprobante" />
      </article>
    </div>
  </section>
</template>
