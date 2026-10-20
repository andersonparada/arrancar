<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/**
 * Pide el motivo de una acción que queda en el historial (quitar una constancia, anular un pago). `resumen` dice qué
 * se va a hacer, para confirmar con los ojos abiertos.
 */
defineProps<{
  abierta: boolean;
  titulo: string;
  resumen: string[];
  ayuda: string;
  boton: string;
  enviando: boolean;
  errores: Record<string, string>;
  encima?: boolean;
}>();
const motivo = defineModel<string>({ required: true });
defineEmits<{ guardar: []; cerrar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="titulo" :encima="encima" @cerrar="$emit('cerrar')">
    <form id="accion-con-motivo" class="flex flex-col gap-4" @submit.prevent="$emit('guardar')">
      <ul class="rounded-lg bg-tierra-100 p-3 text-sm dark:bg-tierra-800">
        <li v-for="linea in resumen" :key="linea">{{ linea }}</li>
      </ul>
      <CampoTexto
        v-model="motivo"
        etiqueta="Motivo"
        :ayuda="ayuda"
        :error="errores.motivo"
        :longitud-maxima="300"
        multilinea
        requerido
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="accion-con-motivo" variante="peligro" :cargando="enviando">{{ boton }}</BotonBase>
    </template>
  </VentanaModal>
</template>
