<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  esParteDeCheque,
  rotuloDelBeneficiario,
  type EdicionDePartida,
} from '../../composables/saldos-iniciales/edicion-de-partida';
import { AYUDA_DEL_CONCEPTO_DEL_POSFECHADO } from '../../textos-de-apertura';

/** Los campos de una partida de apertura; cada parte muestra solo los suyos (serie y número, sentido, concepto). */
defineProps<{
  errores: Record<string, string>;
  /** Fecha de corte `AAAA-MM-DD` y cómo decirla; las partidas no pueden ser posteriores y el posfechado, anteriores. */
  corte: string;
  corteLegible: string;
  opcionesDeConcepto: OpcionDeRegistro[];
}>();
const edicion = defineModel<EdicionDePartida>({ required: true });

const OPCIONES_DE_SENTIDO = [
  { valor: 'credito' as const, texto: 'Suma al saldo en libros (el banco cargó de más o abonó de menos)' },
  { valor: 'debito' as const, texto: 'Resta del saldo en libros (el banco abonó de más o cargó de menos)' },
];
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-if="edicion.parte === 'error_del_banco'"
      v-model="edicion.sentido"
      etiqueta="Efecto del error"
      :opciones="OPCIONES_DE_SENTIDO"
      requerido
      :error="errores.sentido"
    />
    <CampoTexto
      v-model="edicion.fecha"
      :etiqueta="edicion.parte === 'cheque_posfechado' ? 'Fecha del cheque' : 'Fecha'"
      tipo="date"
      requerido
      :maximo="edicion.parte === 'cheque_posfechado' ? undefined : corte"
      :ayuda="
        edicion.parte === 'cheque_posfechado'
          ? `Posterior al ${corteLegible}.`
          : `Del ${corteLegible} o antes (la fecha de corte).`
      "
      :error="errores.fecha"
    />
    <template v-if="esParteDeCheque(edicion.parte)">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.numeroDeCheque"
          etiqueta="Número de cheque"
          tipo="number"
          requerido
          :error="errores.numeroDeCheque"
        />
        <CampoTexto v-model="edicion.serie" etiqueta="Serie" :longitud-maxima="20" :error="errores.serie" />
      </div>
    </template>
    <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="any" requerido :error="errores.monto" />
    <CampoTexto
      v-if="rotuloDelBeneficiario(edicion.parte)"
      v-model="edicion.beneficiario"
      :etiqueta="rotuloDelBeneficiario(edicion.parte)!"
      :requerido="esParteDeCheque(edicion.parte)"
      :error="errores.beneficiario"
    />
    <CampoSelector
      v-if="edicion.parte === 'cheque_posfechado'"
      v-model="edicion.conceptoId"
      etiqueta="Concepto"
      :opciones="opcionesDeConcepto"
      requerido
      :error="errores.conceptoId"
    />
    <p v-if="edicion.parte === 'cheque_posfechado'" class="-mt-2 text-xs text-tierra-500">
      {{ AYUDA_DEL_CONCEPTO_DEL_POSFECHADO }}
    </p>
    <CampoTexto v-model="edicion.referencia" etiqueta="Referencia (boleta, autorización)" :error="errores.referencia" />
    <CampoTexto
      v-model="edicion.observaciones"
      :etiqueta="
        edicion.parte === 'error_del_banco'
          ? 'Descripción del error (qué cargó o abonó mal y cuándo lo corregirá)'
          : 'Observaciones'
      "
      multilinea
      :error="errores.observaciones"
    />
  </div>
</template>
