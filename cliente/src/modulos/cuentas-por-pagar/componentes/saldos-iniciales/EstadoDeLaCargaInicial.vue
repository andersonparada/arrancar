<script setup lang="ts">
import { computed } from 'vue';
import { CalendarCheck, Lock, TriangleAlert } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { ayudaDeLaCarga, type SituacionDeLaCarga } from '../../composables/saldos-iniciales/detalles-de-saldo-inicial';

/** Dice si se puede cargar: la fecha de inicio y si la carga sigue abierta, con el enlace a la empresa para arreglarlo. */
const props = defineProps<{ situacion: SituacionDeLaCarga }>();
const sesion = usarSesion();
const destino = computed(() => ({ name: 'empresas.ficha', params: { empresaId: sesion.empresa?.id ?? '' } }));
const ayuda = computed(() => ayudaDeLaCarga(props.situacion.situacion));
const icono = computed(() =>
  props.situacion.situacion === 'abierta'
    ? CalendarCheck
    : props.situacion.situacion === 'cerrada'
      ? Lock
      : TriangleAlert,
);
</script>

<template>
  <div
    class="mb-4 flex gap-2 rounded-lg p-3 text-sm"
    :class="
      situacion.situacion === 'abierta'
        ? 'bg-campo-50 text-campo-900 dark:bg-campo-900/40 dark:text-campo-100'
        : 'bg-trigo-300/40 text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300'
    "
    role="status"
  >
    <component :is="icono" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0">
      <p class="font-medium">{{ situacion.texto }}</p>
      <p v-if="ayuda">
        {{ ayuda }}
        <RouterLink v-if="sesion.empresa" v-permiso="'empresas.ver'" :to="destino" class="font-medium underline">
          Ir a la empresa
        </RouterLink>
      </p>
    </div>
  </div>
</template>
