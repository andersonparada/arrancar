<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import type { ProblemaDelFormulario } from '../../composables/documentos/errores-del-registro';
import type { RespuestasFiscales } from '../../composables/documentos/preguntas-fiscales';
import { AYUDA_DE_DATOS_FISCALES, FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-del-registro';
import PreguntasDeDatosFiscales from './PreguntasDeDatosFiscales.vue';

/**
 * Un error del servidor explicado dentro del formulario, con lo que el usuario puede hacer: contestar las preguntas
 * del proveedor, confirmar el cambio de régimen, ir a los datos de la empresa o abrir el documento repetido.
 */
defineProps<{ problema: ProblemaDelFormulario; confirmado: boolean }>();
const respuestas = defineModel<RespuestasFiscales>({ required: true });
defineEmits<{ confirmarRegimen: [] }>();

const enlace = 'font-medium underline underline-offset-2';
</script>

<template>
  <div
    class="space-y-3 rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
    role="alert"
  >
    <p class="flex gap-2">
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ problema.mensaje }}</span>
    </p>

    <template v-if="problema.tipo === 'datos_fiscales' && problema.preguntas.length > 0">
      <p class="text-xs">{{ AYUDA_DE_DATOS_FISCALES }}</p>
      <PreguntasDeDatosFiscales v-model="respuestas" :preguntas="problema.preguntas" />
    </template>

    <BotonBase
      v-else-if="problema.tipo === 'regimen' && !confirmado"
      variante="secundario"
      @click="$emit('confirmarRegimen')"
    >
      {{ textos.confirmarRegimen }}
    </BotonBase>

    <RouterLink v-else-if="problema.tipo === 'empresa'" :to="{ name: 'empresas' }" :class="enlace">
      {{ textos.empresaSinDatos }}
    </RouterLink>

    <RouterLink
      v-else-if="problema.tipo === 'repetido' && problema.documentoId"
      :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: problema.documentoId } }"
      :class="enlace"
    >
      {{ textos.repetido }}
    </RouterLink>
  </div>
</template>
