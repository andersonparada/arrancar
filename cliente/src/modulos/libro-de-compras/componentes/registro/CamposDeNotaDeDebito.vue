<script setup lang="ts">
import { computed } from 'vue';
import { Info, TriangleAlert } from 'lucide-vue-next';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { CLASES_DE_CARGO, conceptoDeIntereses } from '../../composables/documentos/notas-de-debito';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';

/** La nota de débito: por qué cobra más el proveedor, con una ayuda corta de cada clase. */
const props = defineProps<{ conceptos: ConceptoDeGasto[]; errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const opciones = [{ valor: null, texto: 'Sin indicar' }, ...CLASES_DE_CARGO];
const ayuda = computed(() => CLASES_DE_CARGO.find(({ valor }) => valor === edicion.value.claseDeCargo)?.ayuda);
const faltaElGastoFinanciero = computed(
  () => edicion.value.claseDeCargo === 'intereses' && !conceptoDeIntereses(props.conceptos),
);
</script>

<template>
  <div class="space-y-2">
    <CampoSelector
      v-model="edicion.claseDeCargo"
      etiqueta="¿Por qué cobra más el proveedor?"
      :opciones="opciones"
      :error="errores.claseDeCargo"
    />
    <p v-if="ayuda" class="flex gap-2 text-sm text-tierra-700 dark:text-tierra-200">
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ ayuda }}</span>
    </p>
    <p
      v-if="faltaElGastoFinanciero"
      class="flex gap-2 rounded-xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="status"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        No hay un concepto de gasto financiero. Elija en la línea el que corresponda, o cree uno en «Conceptos de
        gasto».
      </span>
    </p>
  </div>
</template>
