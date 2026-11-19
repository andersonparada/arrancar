<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeArqueo, ResultadoDelConteo } from '../composables/arqueos/edicion-de-arqueo';
import type { DestinoDelFaltante } from '../servicios/tipos-de-arqueos';
import { MAXIMO_DEL_MOTIVO } from '../textos';
import AlternativasExcluyentes from './AlternativasExcluyentes.vue';

/** Lo que se contesta al arquear además del conteo: cheques por cambiar, comprobantes completos y la diferencia. */
defineProps<{ tipo: ResultadoDelConteo['tipo']; errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeArqueo>({ required: true });

const siONo = [
  { valor: true, texto: 'Sí, están completos', ayuda: 'Cada gasto del fondo tiene su comprobante.' },
  { valor: false, texto: 'No, falta alguno' },
];
const destinos: { valor: DestinoDelFaltante; texto: string; ayuda: string }[] = [
  { valor: 'perdida', texto: 'Se asume como pérdida', ayuda: 'Lo absorbe la empresa como gasto.' },
  { valor: 'cobrar_al_custodio', texto: 'Se cobra al custodio', ayuda: 'Queda como cuenta por cobrar al custodio.' },
];
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      v-model="edicion.valoresPorCambiar"
      etiqueta="Cheques y valores por cambiar"
      tipo="number"
      paso="any"
      ayuda="Cheques recibidos o valores que el fondo todavía no ha cambiado en el banco. Cuentan junto con el efectivo."
      :error="errores.valoresPorCambiar"
    />
    <AlternativasExcluyentes
      v-model="edicion.comprobantesCompletos"
      leyenda="¿Los comprobantes del fondo están completos?"
      requerido
      :opciones="siONo"
      :error="errores.comprobantesCompletos"
    />
    <template v-if="tipo !== 'cuadra'">
      <CampoTexto
        v-model="edicion.motivoDeDiferencia"
        :etiqueta="`Por qué ${tipo === 'faltante' ? 'falta' : 'sobra'} efectivo`"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        :error="errores.motivoDeDiferencia"
      />
      <AlternativasExcluyentes
        v-if="tipo === 'faltante'"
        v-model="edicion.destinoDelFaltante"
        leyenda="¿Qué se hace con el faltante?"
        requerido
        :opciones="destinos"
        :error="errores.destinoDelFaltante"
      />
    </template>
    <CampoTexto
      v-model="edicion.observaciones"
      etiqueta="Observaciones"
      multilinea
      :longitud-maxima="500"
      :error="errores.observaciones"
    />
  </div>
</template>
