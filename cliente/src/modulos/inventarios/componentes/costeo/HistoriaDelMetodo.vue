<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { ETIQUETAS_DE_METODO } from '../../composables/compartido/etiquetas';
import { detalleDeFila } from '../../composables/metodo-de-costeo/textos-de-politica';
import type { FilaDeMetodo } from '../../servicios/metodo-de-costeo.api';

/** Los métodos que ha tenido la empresa, del más reciente al más antiguo. */
defineProps<{ historia: FilaDeMetodo[] }>();
</script>

<template>
  <TarjetaBase>
    <h2 class="font-semibold">Historia del método</h2>
    <p v-if="!historia.length" class="mt-2 text-sm text-tierra-500">Todavía no se ha elegido ningún método.</p>
    <ul v-else class="mt-2 divide-y divide-tierra-100 dark:divide-tierra-800">
      <li v-for="fila in [...historia].reverse()" :key="fila.id" class="py-2">
        <p class="font-medium">
          {{ ETIQUETAS_DE_METODO[fila.metodo] }}
          <InsigniaBase v-if="fila.fijado" tono="trigo">En uso</InsigniaBase>
        </p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ detalleDeFila(fila) }}</p>
      </li>
    </ul>
  </TarjetaBase>
</template>
