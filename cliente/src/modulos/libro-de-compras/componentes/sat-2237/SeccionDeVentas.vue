<script setup lang="ts">
import { computed } from 'vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { cifrasDeVentas, lineasDeRemanente, lineasPorConfirmar } from '../../composables/sat-2237/lineas-de-ventas';
import type { RemanentesDeRetenciones, RespuestaDeVentas } from '../../servicios/sat-2237.api';
import { SECCION_DE_VENTAS as textos } from '../../textos-del-sat-2237';
import SeccionDelSat2237 from './SeccionDelSat2237.vue';

/** Las cifras de ventas del mes y el remanente de retenciones; no se muestra si ningún módulo de ventas responde. */
const props = defineProps<{
  ventas: RespuestaDeVentas[];
  remanentes: RemanentesDeRetenciones | null;
  /** Si falta el saldo del mes anterior, las cifras del remanente se muestran «por confirmar». */
  avisoDeSaldos?: string | null;
  formulario?: RemanentesDeRetenciones['formulario'] | null;
}>();
const cifras = computed(() => cifrasDeVentas(props.ventas));
const porConfirmar = computed(() => props.remanentes === null && Boolean(props.avisoDeSaldos));
const lineas = computed(() => {
  if (props.remanentes) return lineasDeRemanente(props.remanentes);
  return porConfirmar.value ? lineasPorConfirmar(props.formulario ?? null) : [];
});
const valorDe = (tipo: 'monto' | 'cantidad', valor: string): string =>
  tipo === 'monto' ? formatearMonto(valor) : valor;
</script>

<template>
  <div v-if="cifras.length > 0">
    <SeccionDelSat2237 :titulo="textos.titulo" :ayuda="textos.ayuda">
      <dl
        class="divide-y divide-tierra-100 rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:divide-tierra-700 dark:bg-tierra-800/60 dark:ring-tierra-700"
        :aria-label="textos.titulo"
      >
        <div v-for="cifra in cifras" :key="cifra.clave" class="flex justify-between gap-4 px-3 py-2 text-sm">
          <dt>{{ cifra.etiqueta }}</dt>
          <dd class="text-right tabular-nums">{{ valorDe(cifra.tipo, cifra.valor) }}</dd>
        </div>
      </dl>
    </SeccionDelSat2237>
    <SeccionDelSat2237 v-if="porConfirmar" :titulo="textos.porConfirmar.titulo" :ayuda="textos.porConfirmar.ayuda">
      <p
        class="mb-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        role="status"
      >
        {{ avisoDeSaldos }}
      </p>
      <dl
        class="divide-y divide-tierra-100 rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:divide-tierra-700 dark:bg-tierra-800/60 dark:ring-tierra-700"
        :aria-label="textos.porConfirmar.titulo"
      >
        <div
          v-for="linea in lineas"
          :key="linea.etiqueta"
          class="flex justify-between gap-4 px-3 py-2 text-sm font-semibold"
        >
          <dt>{{ linea.etiqueta }}</dt>
          <dd class="text-right">{{ textos.porConfirmar.valor }}</dd>
        </div>
      </dl>
    </SeccionDelSat2237>
    <SeccionDelSat2237 v-else-if="remanentes" :titulo="textos.remanentesTitulo" :ayuda="textos.remanentesAyuda">
      <dl
        class="divide-y divide-tierra-100 rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:divide-tierra-700 dark:bg-tierra-800/60 dark:ring-tierra-700"
        :aria-label="textos.remanentesTitulo"
      >
        <div
          v-for="linea in lineas"
          :key="linea.etiqueta"
          class="flex justify-between gap-4 px-3 py-2 text-sm"
          :class="{ 'font-semibold': linea.destacada }"
        >
          <dt>{{ linea.etiqueta }}</dt>
          <dd class="text-right tabular-nums">
            {{ linea.valor === null ? textos.porConfirmar.valor : formatearMonto(linea.valor) }}
          </dd>
        </div>
      </dl>
    </SeccionDelSat2237>
  </div>
</template>
