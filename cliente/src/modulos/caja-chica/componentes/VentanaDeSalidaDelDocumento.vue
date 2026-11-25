<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import {
  AVISO_SIN_REEMPLAZO,
  opcionesDeReemplazo,
  TEXTOS_DE_SALIDA,
} from '../composables/documento-anulado/documento-anulado';
import {
  DESTINOS_DE_LA_SALIDA,
  resumenDeSalida,
  type EdicionDeSalida,
} from '../composables/documento-anulado/edicion-de-salida';
import type { Comprobante, ComprobanteDeLaBandeja, SalidaDelDocumento } from '../servicios/tipos-de-comprobantes';
import { MAXIMO_DEL_MOTIVO } from '../textos';
import AlternativasExcluyentes from './AlternativasExcluyentes.vue';

/**
 * Resolver un documento anulado por su emisor. Dice qué pasa con cada salida y confirma con un resumen; ninguna toca el
 * efectivo, el vale ni la reposición.
 */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  cargando: boolean;
  errores: Record<string, string>;
  comprobante: Comprobante | null;
  candidatos: readonly ComprobanteDeLaBandeja[];
}>();
const edicion = defineModel<EdicionDeSalida>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opciones = (Object.keys(TEXTOS_DE_SALIDA) as SalidaDelDocumento[]).map((valor) => ({
  valor,
  ...TEXTOS_DE_SALIDA[valor],
}));
const opcionesDeFacturas = computed(() => opcionesDeReemplazo(props.candidatos));
const recupera = computed(() => edicion.value.salida === 'devolucion' || edicion.value.salida === 'cobro');
const resumen = computed(() => (props.comprobante ? resumenDeSalida(props.comprobante, edicion.value) : ''));
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="`Resolver ${comprobante ? tituloDeComprobante(comprobante) : 'el documento'}`"
    @cerrar="emit('cerrar')"
  >
    <form id="form-de-salida" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <AlternativasExcluyentes
        v-model="edicion.salida"
        leyenda="¿Cómo se resuelve?"
        requerido
        :opciones="opciones"
        :error="errores.salida"
      />
      <template v-if="edicion.salida === 'reemplazo'">
        <CampoSelector
          v-model="edicion.reemplazoId"
          etiqueta="Factura nueva"
          requerido
          :opciones="opcionesDeFacturas"
          :error="errores.reemplazoId"
        />
        <p
          v-if="!cargando && candidatos.length === 0"
          class="text-sm text-tierra-600 dark:text-tierra-300"
          role="status"
        >
          {{ AVISO_SIN_REEMPLAZO }}
        </p>
      </template>
      <template v-if="recupera">
        <CampoTexto
          v-model="edicion.monto"
          etiqueta="Monto que se recupera"
          requerido
          paso="any"
          tipo="number"
          :error="errores.monto"
        />
        <CampoSelector
          v-model="edicion.destino"
          etiqueta="Se le recupera a"
          requerido
          :opciones="DESTINOS_DE_LA_SALIDA"
          :error="errores.destino"
        />
      </template>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se resuelve así; queda registrado en la auditoría."
        :error="errores.motivo"
      />
      <p class="text-sm" role="note">{{ resumen }}</p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-salida" :cargando="enviando">Resolver</BotonBase>
    </template>
  </VentanaModal>
</template>
