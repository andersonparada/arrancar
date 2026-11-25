<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeDisputa } from '../composables/documento-anulado/edicion-de-salida';
import { MAXIMO_DEL_MOTIVO } from '../textos';

/** «No reconozco la anulación»: el motivo y dónde está la prueba de pago. No reactiva la factura ni toma el crédito. */
defineProps<{ abierta: boolean; enviando: boolean; errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDisputa>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="No reconozco la anulación" @cerrar="emit('cerrar')">
    <form id="form-de-disputa" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm" role="note">
        El documento sigue sin dar crédito fiscal mientras no se aclare. Si se aclara a favor, el emisor debe dar una
        factura nueva; el crédito se puede tomar hasta dos meses después de la fecha del documento.
      </p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Por qué no se reconoce"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        :error="errores.motivo"
      />
      <CampoTexto
        v-model="edicion.prueba"
        etiqueta="Prueba de pago"
        requerido
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Dónde está: referencia del cheque, voucher o estado de cuenta."
        :error="errores.prueba"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-disputa" :cargando="enviando">Poner en disputa</BotonBase>
    </template>
  </VentanaModal>
</template>
