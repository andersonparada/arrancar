<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { opcionesDeCausa, type EdicionDeAnulacion } from '../composables/reglas-de-acciones';
import { AYUDA_DE_ANULAR, MAXIMO_DEL_MOTIVO } from '../textos';

/** `resumen` dice qué va a pasar; la ventana explica que se anula el registro y no la factura en la SAT. */
defineProps<{ resumen: string; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeAnulacion>({ required: true });
const causas = opcionesDeCausa();
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Anular el registro" @cerrar="emit('cerrar')">
    <form id="form-anulacion" class="space-y-4" @submit.prevent="emit('guardar')">
      <p
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AYUDA_DE_ANULAR }}</span>
      </p>
      <p class="text-sm">{{ resumen }}</p>
      <CampoSelector v-model="edicion.causa" etiqueta="Causa" requerido :opciones="causas" :error="errores.causa" />
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Qué pasó, en pocas palabras."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-anulacion" variante="peligro" :cargando="enviando">
        Anular el registro
      </BotonBase>
    </template>
  </VentanaModal>
</template>
