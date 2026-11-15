<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { datosDelDocumentoQueModifica } from '../../composables/documentos/documento-que-modifica';
import type { FichaDeDocumento } from '../../servicios/documentos.api';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** «Documento que modifica» en la ficha de una nota: con enlace si es una factura del libro; si es del sistema anterior, sus datos. */
const props = defineProps<{ ficha: Pick<FichaDeDocumento, 'documentoQueModifica' | 'facturaAnterior'> }>();
const datos = computed(() => datosDelDocumentoQueModifica(props.ficha));
</script>

<template>
  <SeccionDeFicha v-if="datos" titulo="Documento que modifica">
    <p class="text-sm">
      <RouterLink
        v-if="datos.documentoId"
        class="font-medium text-campo-700 underline dark:text-campo-300"
        :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: datos.documentoId } }"
      >
        {{ datos.texto }}
      </RouterLink>
      <span v-else class="font-medium">{{ datos.texto }}</span>
    </p>
    <DatosDelRegistro v-if="datos.detalles.length" class="mt-3" :detalles="datos.detalles" />
  </SeccionDeFicha>
</template>
