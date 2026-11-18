<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { esPdf } from '../../composables/conciliaciones/estado-de-cuenta';
import type { EstadoDeCuentaAdjuntado } from '../../servicios/conciliaciones.api';

/** El estado de cuenta al lado de la conciliación: PDF en el visor del navegador, foto como imagen. */
defineProps<{ estadoDeCuenta: EstadoDeCuentaAdjuntado; direccion: string }>();
</script>

<template>
  <TarjetaBase class="space-y-2 print:hidden">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-base font-semibold">Vista del estado de cuenta</h3>
      <a
        :href="direccion"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        <ExternalLink class="size-4" aria-hidden="true" />
        Abrir en otra pestaña
      </a>
    </div>
    <iframe
      v-if="esPdf(estadoDeCuenta)"
      :key="estadoDeCuenta.sha256"
      :src="direccion"
      title="Estado de cuenta del banco (PDF)"
      class="h-[70vh] w-full rounded-lg border border-tierra-200 bg-white dark:border-tierra-700"
    />
    <img
      v-else
      :key="estadoDeCuenta.sha256"
      :src="direccion"
      alt="Foto del estado de cuenta del banco"
      class="max-h-[70vh] w-full rounded-lg border border-tierra-200 object-contain dark:border-tierra-700"
    />
  </TarjetaBase>
</template>
