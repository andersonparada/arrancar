<script setup lang="ts">
import { computed } from 'vue';
import { CircleCheckBig, ListChecks, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { fraseDeLaBarra, type ResumenDeLaBarra } from '../../composables/bandeja/resumen-de-la-barra';
import { TEXTOS_DE_LAS_ACCIONES as acciones } from '../../textos-de-la-bandeja';

/**
 * La barra fija de abajo: cuánto hay marcado, con el mismo criterio que «Confirmar» (lo que se registraría y por cuánto),
 * y lo que se puede hacer con ello. Solo las pendientes se completan y se confirman; las bloqueadas solo se descartan.
 * Cada botón exige su permiso.
 */
const props = defineProps<{ resumen: ResumenDeLaBarra; soloDescartar: boolean }>();
const emit = defineEmits<{ completar: []; confirmar: []; descartar: []; quitar: [] }>();
const frase = computed(() => fraseDeLaBarra(props.resumen));
</script>

<template>
  <div
    class="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-tierra-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5 dark:border-tierra-700 dark:bg-tierra-900/95"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p class="text-sm sm:flex-1" aria-live="polite">
        <template v-if="resumen.marcados">
          <strong>{{ frase.marcados }}</strong>
          <template v-if="soloDescartar">.</template>
          <template v-else>
            : {{ frase.seRegistran }} <template v-if="frase.conMonto">{{ formatearMonto(resumen.total) }}</template
            >{{ frase.noSeRegistran }}.
            <span v-if="resumen.conFaltantes" class="text-amber-700 dark:text-amber-400">
              A {{ resumen.conFaltantes }} le{{ resumen.conFaltantes === 1 ? '' : 's' }} falta algo.
            </span>
          </template>
        </template>
        <template v-else>Marque los DTE con los que quiere trabajar.</template>
      </p>
      <div class="flex flex-wrap gap-2">
        <BotonBase v-if="resumen.marcados" variante="fantasma" @click="emit('quitar')">
          {{ acciones.quitarMarcas }}
        </BotonBase>
        <BotonBase
          v-if="!soloDescartar"
          v-permiso="'libro-de-compras.documentos.importar'"
          variante="secundario"
          :icono="ListChecks"
          :deshabilitado="!resumen.marcados"
          @click="emit('completar')"
        >
          {{ acciones.completar }}
        </BotonBase>
        <BotonBase
          v-permiso="'libro-de-compras.dte-recibidos.descartar'"
          variante="secundario"
          :icono="Trash2"
          :deshabilitado="!resumen.marcados"
          @click="emit('descartar')"
        >
          {{ acciones.descartar }}
        </BotonBase>
        <BotonBase
          v-if="!soloDescartar"
          v-permiso="'libro-de-compras.documentos.crear'"
          :icono="CircleCheckBig"
          :deshabilitado="!resumen.marcados"
          @click="emit('confirmar')"
        >
          {{ acciones.confirmar }}
        </BotonBase>
      </div>
    </div>
  </div>
</template>
