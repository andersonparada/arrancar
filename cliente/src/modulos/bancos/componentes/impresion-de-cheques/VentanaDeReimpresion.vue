<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import {
  MAXIMO_DEL_MOTIVO,
  resumenDeLaReimpresion,
  type EdicionDeReimpresion,
} from '../../composables/impresion-de-cheques/edicion-de-reimpresion';

/**
 * Reimprimir un cheque ya impreso: motivo obligatorio (queda en la auditoría) y si se vuelve a imprimir el cheque o solo
 * su comprobante. Al confirmar se registra y se abre la pantalla de impresión.
 */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const edicion = defineModel<EdicionDeReimpresion>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="`Reimprimir el ${edicion.titulo}`" @cerrar="emit('cerrar')">
    <form id="form-reimpresion" class="space-y-4" @submit.prevent="emit('confirmar')">
      <CampoInterruptor
        v-model="edicion.conCheque"
        etiqueta="Incluir el cheque"
        descripcion="Apagado, solo se imprime otra copia del comprobante. Enciéndalo si el formulario sigue en blanco y hay que volver a imprimirlo."
      />
      <p class="rounded-lg bg-tierra-100 p-3 text-sm text-tierra-800 dark:bg-tierra-800 dark:text-tierra-100">
        {{ resumenDeLaReimpresion(edicion) }}
      </p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        multilinea
        requerido
        contar
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por ejemplo: «Se atascó el papel» o «Otra copia para el archivo»."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-reimpresion" :cargando="enviando">Reimprimir</BotonBase>
    </template>
  </VentanaModal>
</template>
