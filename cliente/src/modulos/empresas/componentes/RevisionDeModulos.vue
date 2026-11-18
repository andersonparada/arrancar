<script setup lang="ts">
import { computed } from 'vue';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-vue-next';
import { RouterLink, useRouter } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { bloquesDeRevision, destinoDeRevision, type BloqueDeRevision } from '../composables/revision-de-cierre';
import type { RevisionDeCierreDeModulo } from '../servicios/cierre-de-carga.tipos';

/**
 * Lo que encontró cada módulo: hallazgos (los que piden motivo en rojo, los avisos en ámbar, cada uno con su
 * texto y su icono para no depender solo del color) y las cifras del cuadre. Con `conEnlaces`, ofrece ir a
 * corregir a la pantalla del módulo, si el usuario puede entrar a ella.
 */
const props = defineProps<{ modulos: RevisionDeCierreDeModulo[]; conEnlaces?: boolean }>();

const router = useRouter();
const sesion = usarSesion();
const bloques = computed(() => bloquesDeRevision(props.modulos));
const destino = (ruta: string | null) =>
  props.conEnlaces ? destinoDeRevision(ruta, (r) => router.resolve(r), sesion.puede) : null;
const totalDeCifras = (bloque: BloqueDeRevision) => bloque.gruposDeCifras.reduce((n, g) => n + g.cifras.length, 0);
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="bloque in bloques"
      :key="bloque.nombre"
      class="space-y-2 rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 class="font-semibold">{{ bloque.nombre }}</h3>
        <RouterLink
          v-if="destino(bloque.ruta)"
          :to="destino(bloque.ruta) ?? ''"
          class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
        >
          Revisar en {{ bloque.nombre }}
        </RouterLink>
      </div>
      <p v-if="bloque.resumen" class="text-sm text-tierra-600 dark:text-tierra-300">{{ bloque.resumen }}</p>

      <ul v-if="bloque.hallazgos.length > 0" class="space-y-1.5">
        <li
          v-for="(hallazgo, indice) in bloque.hallazgos"
          :key="indice"
          class="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
          :class="
            hallazgo.nivel === 'pide_motivo'
              ? 'bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-200'
              : 'bg-trigo-300/40 text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300'
          "
        >
          <component
            :is="hallazgo.nivel === 'pide_motivo' ? CircleAlert : TriangleAlert"
            class="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p class="min-w-0 break-words">
            <span class="font-semibold">{{ hallazgo.nivel === 'pide_motivo' ? 'Diferencia: ' : 'Aviso: ' }}</span>
            <span v-if="hallazgo.registro" class="font-medium">{{ hallazgo.registro.nombre }}. </span>
            {{ hallazgo.mensaje }}
          </p>
        </li>
      </ul>
      <p v-else class="flex items-center gap-1.5 text-sm text-campo-700 dark:text-campo-400">
        <CircleCheck class="size-4" aria-hidden="true" />
        Sin observaciones.
      </p>

      <details v-if="totalDeCifras(bloque) > 0" :open="totalDeCifras(bloque) <= 8" class="text-sm">
        <summary class="cursor-pointer font-medium text-tierra-700 dark:text-tierra-200">
          Cifras del cuadre ({{ totalDeCifras(bloque) }})
        </summary>
        <div v-for="(grupo, indice) in bloque.gruposDeCifras" :key="indice" class="mt-2">
          <h4 v-if="grupo.titulo" class="mb-1 break-words font-medium">{{ grupo.titulo }}</h4>
          <dl class="divide-y divide-tierra-100 dark:divide-tierra-800">
            <div v-for="cifra in grupo.cifras" :key="cifra.clave" class="flex justify-between gap-3 py-1">
              <dt class="min-w-0 break-words text-tierra-600 dark:text-tierra-300">{{ cifra.etiqueta }}</dt>
              <dd class="shrink-0 text-right font-medium tabular-nums">{{ cifra.valor }}</dd>
            </div>
          </dl>
        </div>
      </details>
    </li>
  </ul>
</template>
