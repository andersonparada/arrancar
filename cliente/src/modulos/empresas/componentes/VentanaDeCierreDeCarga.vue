<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { MAXIMO_DEL_MOTIVO, textoDelConteo } from '../composables/revision-de-cierre';
import { textoDelCierre } from '../composables/usar-cierre-de-carga';
import type { RevisionDeCierre } from '../servicios/cierre-de-carga.tipos';
import RevisionDeModulos from './RevisionDeModulos.vue';

/** La ventana de cierre: lo que dice cada módulo, el motivo (solo si lo piden) y la confirmación. */
const props = defineProps<{
  abierta: boolean;
  cargando: boolean;
  revision: RevisionDeCierre | null;
  fechaDeInicio: string | null;
  avisoDeCambio: string;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cancelar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });

const conteo = computed(() => textoDelConteo(props.revision?.diferencias ?? 0, props.revision?.avisos ?? 0));
const ayudaDelMotivo = computed(() => {
  const diferencias = props.revision?.diferencias ?? 0;
  return props.revision?.pideMotivo
    ? `Obligatorio: hay ${diferencias === 1 ? '1 diferencia' : `${diferencias} diferencias`} y debe quedar escrito por qué se cierra así.`
    : 'Opcional. Si lo escribe, queda en la auditoría junto con el cierre.';
});
const textoDelBoton = computed(() => {
  const diferencias = props.revision?.diferencias ?? 0;
  if (diferencias === 0) return 'Cerrar carga inicial';
  return `Cerrar con ${diferencias === 1 ? '1 diferencia' : `${diferencias} diferencias`}`;
});
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Cerrar la carga inicial" ancha encima @cerrar="emit('cancelar')">
    <form id="form-cierre" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ textoDelCierre(fechaDeInicio) }}</p>
      <p
        v-if="avisoDeCambio"
        role="alert"
        class="rounded-lg bg-trigo-300/40 px-3 py-2 text-sm font-medium text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        {{ avisoDeCambio }}
      </p>
      <p v-if="cargando" role="status" class="text-sm text-tierra-500">Revisando lo que cargó cada módulo…</p>
      <template v-else-if="revision">
        <p class="font-semibold" role="status">Resultado de la revisión: {{ conteo }}</p>
        <RevisionDeModulos :modulos="revision.modulos" con-enlaces />
        <CampoTexto
          v-model="motivo"
          etiqueta="Motivo del cierre"
          multilinea
          contar
          :longitud-maxima="MAXIMO_DEL_MOTIVO"
          :requerido="revision.pideMotivo"
          :ayuda="ayudaDelMotivo"
          :error="errores.motivo"
        />
      </template>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cancelar')">Cancelar</BotonBase>
      <BotonBase
        tipo="submit"
        form="form-cierre"
        variante="peligro"
        :cargando="enviando"
        :deshabilitado="cargando || !revision"
      >
        {{ textoDelBoton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
