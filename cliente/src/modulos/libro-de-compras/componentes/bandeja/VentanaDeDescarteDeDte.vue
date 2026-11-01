<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/** Descartar uno o varios DTE: pide por qué, que queda en el historial. Descartar no borra nada: se puede restaurar. */
defineProps<{ abierta: boolean; cantidad: number; errores: Record<string, string>; enviando: boolean }>();
const motivo = defineModel<string>({ required: true });
const emit = defineEmits<{ cerrar: []; descartar: [] }>();
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="cantidad === 1 ? 'Descartar el DTE' : `Descartar ${cantidad} DTE`"
    @cerrar="emit('cerrar')"
  >
    <form id="form-descartar-dte" class="space-y-4" @submit.prevent="emit('descartar')">
      <p
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Descartar no registra nada ni borra el DTE: queda en «Descartados» y puede restaurarlo si fue un error.
        </span>
      </p>
      <CampoTexto
        v-model="motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        ayuda="Por qué no se registra, en pocas palabras."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-descartar-dte" variante="peligro" :cargando="enviando">Descartar</BotonBase>
    </template>
  </VentanaModal>
</template>
