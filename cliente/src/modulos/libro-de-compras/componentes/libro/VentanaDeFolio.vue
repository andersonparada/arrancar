<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { MAXIMO_DEL_MOTIVO } from '../../composables/libro/datos-de-emisiones';
import { VENTANA_DE_FOLIO as textos } from '../../textos-del-libro';

/** Corrige el último folio usado, con su motivo (queda en la auditoría). */
defineProps<{ abierta: boolean; enviando: boolean; errores: Record<string, string> }>();
const folio = defineModel<string | number>('folio', { required: true });
const motivo = defineModel<string>('motivo', { required: true });
defineEmits<{ guardar: []; cerrar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="textos.titulo" @cerrar="$emit('cerrar')">
    <form id="corregir-folio" class="flex flex-col gap-4" @submit.prevent="$emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ textos.explicacion }}</p>
      <CampoTexto
        v-model="folio"
        :etiqueta="textos.folio"
        :ayuda="textos.folioAyuda"
        :error="errores.ultimoFolio"
        tipo="number"
        requerido
      />
      <CampoTexto
        v-model="motivo"
        :etiqueta="textos.motivo"
        :error="errores.motivo"
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        multilinea
        requerido
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="corregir-folio" :cargando="enviando">{{ textos.guardar }}</BotonBase>
    </template>
  </VentanaModal>
</template>
