<script setup lang="ts">
import { computed } from 'vue';
import { Download, FileSearch, History } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { textoDeAvisosDelCierre, textoDelUltimoCierre } from '../composables/resumen-de-cierre';
import type { CargaInicial } from '../servicios/cierre-de-carga.tipos';

/** La línea del último cierre y, con el permiso, ver su revisión, exportarla y abrir el historial. */
const props = defineProps<{ carga: CargaInicial; exportando: boolean }>();
const emit = defineEmits<{ verRevision: []; exportar: []; verHistorial: [] }>();

const linea = computed(() => textoDelUltimoCierre(props.carga));
const avisos = computed(() => textoDeAvisosDelCierre(props.carga));
const hayRevision = computed(() => props.carga.ultimoCierre?.revisionGuardada ?? false);
</script>

<template>
  <div v-if="linea" class="space-y-2">
    <p class="break-words text-sm text-tierra-700 dark:text-tierra-200">
      {{ linea }} <span v-if="avisos" class="text-tierra-500">{{ avisos }}</span>
    </p>
    <div class="flex flex-wrap gap-2">
      <BotonBase
        v-if="hayRevision"
        v-permiso="'empresas.carga-inicial.ver-cierres'"
        variante="secundario"
        pequeno
        :icono="FileSearch"
        @click="emit('verRevision')"
      >
        Ver revisión
      </BotonBase>
      <BotonBase
        v-if="hayRevision"
        v-permiso="'empresas.carga-inicial.exportar'"
        variante="secundario"
        pequeno
        :icono="Download"
        :cargando="exportando"
        @click="emit('exportar')"
      >
        Exportar revisión
      </BotonBase>
      <BotonBase
        v-permiso="'empresas.carga-inicial.ver-cierres'"
        variante="fantasma"
        pequeno
        :icono="History"
        @click="emit('verHistorial')"
      >
        Historial
      </BotonBase>
    </div>
  </div>
</template>
