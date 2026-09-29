<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import {
  nivelDeAntiguedad,
  numeroDeChequeConSerie,
  TEXTO_DEL_ORIGEN,
  textoDeAntiguedad,
} from '../../composables/cheques-caducos/antiguedad-de-cheques';
import type { ChequeCaduco } from '../../servicios/cheques-caducos.api';

/**
 * Una fila del reporte. Los días de antigüedad van destacados: en amarillo al pasar el plazo y en rojo
 * pasado un año. Es una fila aparte para que la anulación en lote le agregue su casilla al inicio.
 */
const props = defineProps<{ cheque: ChequeCaduco }>();

const TONO = { vencido: 'trigo', 'muy-vencido': 'rojo' } as const;
const antiguedad = computed(() => textoDeAntiguedad(props.cheque.diasDeAntiguedad));
const tono = computed(() => TONO[nivelDeAntiguedad(props.cheque.diasDeAntiguedad)]);
</script>

<template>
  <tr>
    <td class="px-4 py-2.5">{{ cheque.cuentaBancariaNombre }}</td>
    <td class="px-4 py-2.5 whitespace-nowrap">{{ numeroDeChequeConSerie(cheque) }}</td>
    <td class="px-4 py-2.5 whitespace-nowrap">{{ formatearFecha(cheque.fecha) }}</td>
    <td class="px-4 py-2.5 whitespace-nowrap">
      <InsigniaBase :tono="tono">{{ antiguedad.dias }}</InsigniaBase>
      <span class="ml-1.5 text-xs text-tierra-500">{{ antiguedad.meses }}</span>
    </td>
    <td class="px-4 py-2.5">{{ formatearTexto(cheque.beneficiario) }}</td>
    <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(cheque.monto) }}</td>
    <td class="px-4 py-2.5 whitespace-nowrap">
      <InsigniaBase :tono="cheque.mesConciliado ? 'campo' : 'tierra'">
        {{ cheque.mesConciliado ? 'Conciliado' : 'Abierto' }}
      </InsigniaBase>
    </td>
    <td class="px-4 py-2.5 whitespace-nowrap">{{ TEXTO_DEL_ORIGEN[cheque.origen] }}</td>
  </tr>
</template>
