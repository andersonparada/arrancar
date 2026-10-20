<script setup lang="ts">
import { Download } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFechaHora } from '@/modulos/core/utilidades/formato';
import { rangoDeFolios } from '../../composables/libro/datos-de-emisiones';
import type { EmisionDelLibro } from '../../servicios/libro.api';
import { EMISIONES_DEL_LIBRO as textos } from '../../textos-del-libro';

/** Las emisiones con folios del período, de la más nueva a la más vieja, con su copia para descargar. */
defineProps<{ emisiones: EmisionDelLibro[]; ultimoFolio: number }>();
defineEmits<{ copia: [id: string] }>();
</script>

<template>
  <section class="mt-6" aria-labelledby="titulo-emisiones">
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="titulo-emisiones" class="text-base font-semibold">{{ textos.titulo }}</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ textos.ultimoFolio }}: <strong class="tabular-nums">{{ ultimoFolio || textos.sinFolios }}</strong>
      </p>
    </div>
    <p
      v-if="emisiones.length === 0"
      class="rounded-2xl bg-white p-4 text-sm ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    >
      {{ textos.vacio }} <span class="text-tierra-500">{{ textos.vacioAyuda }}</span>
    </p>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="emision in emisiones"
        :key="emision.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
      >
        <div class="min-w-0">
          <p class="flex flex-wrap items-center gap-2 font-medium">
            {{ rangoDeFolios(emision) }}
            <InsigniaBase :tono="emision.sustituida ? 'tierra' : 'campo'">
              {{ emision.sustituida ? textos.sustituida : textos.vigente }}
            </InsigniaBase>
          </p>
          <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ formatearFechaHora(emision.creadoEn) }}</p>
          <p v-if="emision.motivo" class="mt-1 break-words text-sm text-tierra-600 dark:text-tierra-300">
            Motivo: {{ emision.motivo }}
          </p>
        </div>
        <BotonBase
          variante="secundario"
          :icono="Download"
          :title="textos.copiaAyuda"
          @click="$emit('copia', emision.id)"
        >
          {{ textos.copia }}
        </BotonBase>
      </li>
    </ul>
  </section>
</template>
