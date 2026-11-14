<script setup lang="ts">
import { computed } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import {
  nombreDeMostrarAnteriores,
  textoDeAnterioresOcultos,
} from '../../composables/bandeja/anteriores-a-la-fecha-de-inicio';
import { ANTERIORES_A_LA_FECHA_DE_INICIO as textos } from '../../textos-de-anteriores';

/**
 * En Pendientes los DTE de antes de la fecha de inicio van ocultos: este aviso dice cuántos son, explica qué hacer
 * con ellos y deja verlos con un clic; con ellos a la vista, deja volver a ocultarlos.
 */
const props = defineProps<{ fechaDeInicio: string; ocultos: number; mostrando: boolean }>();
defineEmits<{ mostrar: []; ocultar: [] }>();
const fecha = computed(() => formatearFecha(props.fechaDeInicio));
</script>

<template>
  <div
    class="mb-4 flex flex-col gap-3 rounded-2xl bg-tierra-100 p-4 text-sm text-tierra-800 sm:flex-row sm:items-center sm:justify-between dark:bg-tierra-800 dark:text-tierra-100"
    role="status"
  >
    <div class="min-w-0">
      <p v-if="mostrando" class="font-medium">{{ textos.mostrandoTodos }}</p>
      <p v-else class="font-medium">{{ textoDeAnterioresOcultos(ocultos, fecha) }}</p>
      <p class="mt-1 text-tierra-600 dark:text-tierra-300">{{ textos.ayuda }}</p>
    </div>
    <BotonBase
      v-if="mostrando"
      variante="secundario"
      pequeno
      class="shrink-0"
      :icono="EyeOff"
      @click="$emit('ocultar')"
    >
      {{ textos.ocultar }}
    </BotonBase>
    <BotonBase
      v-else
      variante="secundario"
      pequeno
      class="shrink-0"
      :icono="Eye"
      :aria-label="nombreDeMostrarAnteriores(ocultos)"
      @click="$emit('mostrar')"
    >
      {{ textos.mostrar }} {{ ocultos }}
    </BotonBase>
  </div>
</template>
