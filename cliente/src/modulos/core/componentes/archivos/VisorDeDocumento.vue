<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';

/**
 * El documento adjunto a la vista: PDF en el visor del navegador, foto como imagen. En el celular el visor
 * puede mostrar solo la primera página, por eso siempre ofrece abrirlo en otra pestaña.
 */
defineProps<{
  direccion: string;
  titulo: string;
  esPdf?: boolean;
  /** Cambia cuando cambia el archivo, para que el visor lo vuelva a pedir. */
  clave?: string;
}>();
</script>

<template>
  <div class="space-y-2">
    <a
      :href="direccion"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-1 text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
    >
      <ExternalLink class="size-4" aria-hidden="true" />
      Abrir en otra pestaña
    </a>
    <iframe
      v-if="esPdf ?? true"
      :key="clave"
      :src="direccion"
      :title="titulo"
      class="h-[65vh] w-full rounded-lg border border-tierra-200 bg-white dark:border-tierra-700"
    />
    <img
      v-else
      :key="clave"
      :src="direccion"
      :alt="titulo"
      class="max-h-[65vh] w-full rounded-lg border border-tierra-200 object-contain dark:border-tierra-700"
    />
  </div>
</template>
