<script setup lang="ts">
import { computed } from 'vue';
import { AYUDA_DE_CHEQUERA_DE_APERTURA, ETIQUETA_DE_CHEQUERAS_DE_APERTURA } from '../../textos-de-apertura';
import { gruposDeChequeras } from '../../composables/chequeras/grupos-de-chequeras';
import type { Chequera } from '../../servicios/chequeras.api';
import TarjetaDeChequera from './TarjetaDeChequera.vue';

/**
 * Las tarjetas de las chequeras: primero las de siempre y, debajo, «De la carga inicial» con su explicación. Esa
 * chequera no se emite ni se inactiva, así que su tarjeta solo lleva «Ver cheques».
 */
const props = defineProps<{ chequeras: Chequera[] }>();
const emit = defineEmits<{ 'cambiar-estado': [chequera: Chequera]; formato: [chequera: Chequera] }>();
const grupos = computed(() => gruposDeChequeras(props.chequeras));
</script>

<template>
  <div class="space-y-4">
    <ul v-if="grupos.normales.length" class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="registro in grupos.normales" :key="registro.id">
        <TarjetaDeChequera
          :registro="registro"
          @cambiar-estado="emit('cambiar-estado', registro)"
          @formato="emit('formato', registro)"
        />
      </li>
    </ul>
    <section v-if="grupos.deApertura.length" aria-labelledby="chequeras-de-apertura" class="space-y-2">
      <h3 id="chequeras-de-apertura" class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">
        {{ ETIQUETA_DE_CHEQUERAS_DE_APERTURA }}
      </h3>
      <p class="text-xs text-tierra-500">{{ AYUDA_DE_CHEQUERA_DE_APERTURA }}</p>
      <ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li v-for="registro in grupos.deApertura" :key="registro.id">
          <TarjetaDeChequera
            :registro="registro"
            @cambiar-estado="emit('cambiar-estado', registro)"
            @formato="emit('formato', registro)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
