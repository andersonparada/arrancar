<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeAnulacionDePago } from '../composables/pagos/usar-acciones-del-pago';
import { MAXIMO_DEL_MOTIVO } from '../textos';

/** Anular un pago: dice qué va a pasar, pide el motivo (queda en la auditoría) y, si mueve dinero, la fecha en Bancos. */
defineProps<{ titulo: string; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeAnulacionDePago>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-anular-pago" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">{{ edicion.resumen }}</p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se anula; queda registrado en la auditoría."
        :error="errores.motivo"
      />
      <CampoTexto
        v-if="edicion.conFecha"
        v-model="edicion.fecha"
        etiqueta="Fecha de la anulación en Bancos"
        tipo="date"
        ayuda="Opcional. Si la deja en blanco, Bancos la decide; revise que ese mes no esté conciliado."
        :error="errores.fecha"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-anular-pago" variante="peligro" :cargando="enviando"
        >Anular el pago</BotonBase
      >
    </template>
  </VentanaModal>
</template>
