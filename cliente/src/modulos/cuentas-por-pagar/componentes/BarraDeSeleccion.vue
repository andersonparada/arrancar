<script setup lang="ts">
import type { Component } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/**
 * La barra fija de abajo de una lista con selección: cuántos documentos hay marcados, el aviso del lote y el botón
 * de la acción. Quien la usa decide con `v-permiso` si se muestra.
 */
defineProps<{
  cantidad: number;
  /** Qué hace el botón, por ejemplo «Completar». */
  accion: string;
  icono?: Component;
  /** Qué invita a hacer cuando no hay nada marcado. */
  invitacion: string;
  aviso?: string;
  enviando?: boolean;
}>();
const emit = defineEmits<{ accion: []; limpiar: [] }>();
</script>

<template>
  <div
    class="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-tierra-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5 dark:border-tierra-700 dark:bg-tierra-900/95"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-sm" aria-live="polite">
        <p v-if="cantidad">
          <strong>{{ cantidad }}</strong> {{ cantidad === 1 ? 'marcado' : 'marcados' }}
        </p>
        <p v-else>{{ invitacion }}</p>
        <p v-if="aviso" class="text-xs text-tierra-600 dark:text-tierra-300">{{ aviso }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <BotonBase v-if="cantidad" variante="fantasma" @click="emit('limpiar')">Quitar marcas</BotonBase>
        <BotonBase :icono="icono" :deshabilitado="cantidad === 0" :cargando="enviando" @click="emit('accion')">
          {{ accion }}
        </BotonBase>
      </div>
    </div>
  </div>
</template>
