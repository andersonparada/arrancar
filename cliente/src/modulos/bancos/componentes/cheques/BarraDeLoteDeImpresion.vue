<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/**
 * La barra de los cheques elegidos para imprimir: dice cuántos son y de qué números (con aviso si hay huecos) y se queda
 * a la vista al bajar por la lista, también en el celular.
 */
defineProps<{ cantidad: number; resumen: string }>();
const emit = defineEmits<{ imprimir: []; 'marcar-todos': []; limpiar: [] }>();
</script>

<template>
  <div
    v-if="cantidad > 0"
    v-permiso="'bancos.cheques.imprimir'"
    class="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-tierra-300 dark:bg-tierra-800 dark:ring-tierra-600"
    role="region"
    aria-label="Cheques elegidos para imprimir"
  >
    <p class="min-w-0 flex-1 text-sm font-medium" role="status">{{ resumen }}</p>
    <BotonBase variante="fantasma" pequeno @click="emit('marcar-todos')">Elegir todos los de la chequera</BotonBase>
    <BotonBase variante="fantasma" pequeno @click="emit('limpiar')">Quitar la selección</BotonBase>
    <BotonBase :icono="Printer" @click="emit('imprimir')">Imprimir seleccionados</BotonBase>
  </div>
</template>
