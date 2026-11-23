<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { TEXTOS_DE_BASE, type EdicionDeRebaja } from '../../composables/recepciones/edicion-de-nota';

/** Rebajar el costo con una nota de crédito sin devolución física: el monto se reparte entre lo recibido. */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const edicion = defineModel<EdicionDeRebaja>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="`Rebajar el costo · ${edicion.nota}`" @cerrar="emit('cerrar')">
    <form id="form-de-rebaja" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        La nota puede rebajar hasta {{ formatearMonto(edicion.pendiente) }}. No mueve existencias: baja el costo de la
        mercadería de la factura.
      </p>
      <CampoTexto v-model="edicion.fecha" etiqueta="Fecha de la rebaja" tipo="date" requerido :error="errores.fecha" />
      <CampoTexto
        v-model="edicion.monto"
        etiqueta="Monto a rebajar (Q)"
        tipo="number"
        paso="any"
        requerido
        :error="errores.monto"
      />
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">Cómo se reparte</legend>
        <label
          v-for="(texto, base) in TEXTOS_DE_BASE"
          :key="base"
          class="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 ring-tierra-200 has-[:checked]:bg-campo-50 has-[:checked]:ring-campo-500 dark:ring-tierra-700 dark:has-[:checked]:bg-campo-900/40"
        >
          <input
            v-model="edicion.base"
            type="radio"
            name="base-de-rebaja"
            :value="base"
            class="mt-1 size-4 text-campo-700"
          />
          <span>
            <span class="block font-medium">{{ texto.titulo }}</span>
            <span class="block text-sm text-tierra-600 dark:text-tierra-300">{{ texto.ayuda }}</span>
          </span>
        </label>
      </fieldset>
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-rebaja" :cargando="enviando">Rebajar</BotonBase>
    </template>
  </VentanaModal>
</template>
