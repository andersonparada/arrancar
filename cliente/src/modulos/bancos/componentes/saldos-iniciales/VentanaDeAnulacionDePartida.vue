<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { tituloDePartida } from '../../composables/saldos-iniciales/detalles-de-partida';
import type { PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import {
  AYUDA_DEL_PAGADOR,
  textoDeAnulacionDeCheque,
  textoDeAnulacionDeDeposito,
  textoDeAnulacionDeOtra,
} from '../../textos-de-apertura';

/**
 * Anular una partida de apertura: explica qué se registrará (nota inverso después del corte, y que la deuda con el
 * beneficiario sigue) y pide fecha, motivo y, en el depósito en tránsito, quién debe ese dinero.
 */
const props = defineProps<{
  partida: PartidaDeApertura | null;
  corteLegible: string;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
const fecha = defineModel<string>('fecha', { required: true });
const pagador = defineModel<string>('pagador', { required: true });

const esDeposito = computed(() => props.partida?.parte === 'deposito_en_transito');
const texto = computed(() => {
  const parte = props.partida?.parte;
  if (parte === 'cheque_en_circulacion') return textoDeAnulacionDeCheque(props.corteLegible);
  if (parte === 'deposito_en_transito') return textoDeAnulacionDeDeposito(props.corteLegible);
  return textoDeAnulacionDeOtra(props.corteLegible);
});
</script>

<template>
  <VentanaModal
    :abierta="!!partida"
    :titulo="partida ? `Anular: ${tituloDePartida(partida)}` : 'Anular partida'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-de-anulacion" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ texto }}</p>
      <CampoTexto
        v-model="fecha"
        etiqueta="Fecha del movimiento inverso"
        tipo="date"
        requerido
        :error="errores.fecha"
      />
      <CampoTexto
        v-if="esDeposito"
        v-model="pagador"
        etiqueta="Pagador"
        requerido
        :ayuda="AYUDA_DEL_PAGADOR"
        :longitud-maxima="150"
        :error="errores.pagador"
      />
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-anulacion" variante="peligro" :cargando="enviando">Anular</BotonBase>
    </template>
  </VentanaModal>
</template>
