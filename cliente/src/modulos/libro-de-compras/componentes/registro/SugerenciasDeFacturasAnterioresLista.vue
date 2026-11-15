<script setup lang="ts">
import { computed } from 'vue';
import {
  facturaDesdeSugerencia,
  textoDeSugerencia,
  type FacturaAnteriorEnEdicion,
} from '../../composables/documentos/edicion-de-factura-anterior';
import type { FacturaAnteriorSugerida, SugerenciasDeFacturasAnteriores } from '../../servicios/facturas-anteriores.api';
import { FACTURA_ANTERIOR as textos } from '../../textos-del-registro';

/** Facturas anteriores que el sistema ya conoce de este proveedor: un clic llena todos los datos. */
const props = defineProps<{ sugerencias: SugerenciasDeFacturasAnteriores }>();
const factura = defineModel<FacturaAnteriorEnEdicion>({ required: true });

const grupos = computed(() =>
  [
    { titulo: textos.sugeridasUsadas, lista: props.sugerencias.usadas },
    { titulo: textos.sugeridasDeLaBandeja, lista: props.sugerencias.deLaBandeja },
  ].filter(({ lista }) => lista.length > 0),
);

const usar = (sugerida: FacturaAnteriorSugerida): void => {
  factura.value = facturaDesdeSugerencia(sugerida);
};
</script>

<template>
  <div v-if="grupos.length" class="space-y-3">
    <p class="text-sm font-medium">{{ textos.sugeridasTitulo }}</p>
    <section v-for="grupo in grupos" :key="grupo.titulo" :aria-label="grupo.titulo">
      <h3 class="mb-1.5 text-xs font-semibold tracking-wide text-tierra-600 uppercase dark:text-tierra-300">
        {{ grupo.titulo }}
      </h3>
      <ul class="flex flex-wrap gap-2">
        <li v-for="sugerida in grupo.lista" :key="`${sugerida.serie}-${sugerida.numero}`" class="max-w-full">
          <button
            type="button"
            class="min-h-11 max-w-full rounded-xl bg-white px-3 py-2 text-left text-sm ring-1 ring-tierra-300 hover:bg-campo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-campo-500 dark:bg-tierra-800 dark:ring-tierra-600 dark:hover:bg-tierra-700"
            @click="usar(sugerida)"
          >
            {{ textoDeSugerencia(sugerida) }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
