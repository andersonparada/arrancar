<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import type { ComprobanteDeEgreso as Comprobante } from '../../servicios/tipos-de-impresion-de-cheques';
import ComprobanteDeEgreso from './ComprobanteDeEgreso.vue';

/**
 * El comprobante dentro de la hoja del cheque (voucher), en la zona que reservó el formato. Si lo que hay que decir
 * no cabe en esa zona, avisa (`desborda`) en vez de callar: un comprobante cortado es peor que uno en hoja aparte.
 */
const props = defineProps<{ comprobante: Comprobante; yMm: number; altoMm: number }>();
const emit = defineEmits<{ desborda: [desborda: boolean] }>();
const zona = ref<HTMLElement | null>(null);

async function medir(): Promise<void> {
  await nextTick();
  const caja = zona.value;
  if (caja) emit('desborda', caja.scrollHeight > caja.clientHeight + 1);
}

onMounted(medir);
watch(() => [props.comprobante, props.yMm, props.altoMm], medir);
</script>

<template>
  <div
    ref="zona"
    class="absolute inset-x-0 overflow-hidden px-[8mm] text-black"
    :style="{ top: `${yMm}mm`, height: `${altoMm}mm` }"
  >
    <ComprobanteDeEgreso :comprobante="comprobante" />
  </div>
</template>
