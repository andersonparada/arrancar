<script setup lang="ts">
import { computed } from 'vue';
import { CalendarCheck, Lock, TriangleAlert } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { situacionDeLaApertura } from '../../composables/saldos-iniciales/detalles-de-saldos-iniciales';
import type { SaldosIniciales } from '../../servicios/tipos-de-saldos-iniciales';

/** Dice cómo está la carga inicial (abierta, cerrada o sin fecha de inicio) con las fechas de inicio y de corte. */
const props = defineProps<{ saldos: Pick<SaldosIniciales, 'fechaDeInicio' | 'fechaDeCorte' | 'cargaCerrada'> }>();
const sesion = usarSesion();
const situacion = computed(() => situacionDeLaApertura(props.saldos));
const abierta = computed(() => situacion.value.situacion === 'abierta');
const icono = computed(() =>
  abierta.value ? CalendarCheck : situacion.value.situacion === 'cerrada' ? Lock : TriangleAlert,
);
const destino = computed(() => ({ name: 'empresas.ficha', params: { empresaId: sesion.empresa?.id ?? '' } }));
</script>

<template>
  <div
    class="mb-4 flex gap-2 rounded-lg p-3 text-sm"
    :class="
      abierta
        ? 'bg-campo-50 text-campo-900 dark:bg-campo-900/40 dark:text-campo-100'
        : 'bg-trigo-300/40 text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300'
    "
    role="status"
  >
    <component :is="icono" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0">
      <p class="font-medium">{{ situacion.texto }}</p>
      <p v-if="saldos.fechaDeInicio">
        Fecha de inicio: {{ formatearFecha(saldos.fechaDeInicio) }}. Fecha de corte:
        {{ formatearFecha(saldos.fechaDeCorte) }} (el día anterior): a esa fecha están los saldos.
      </p>
      <p v-if="situacion.ayuda">{{ situacion.ayuda }}</p>
      <RouterLink
        v-if="sesion.empresa && !abierta"
        v-permiso="'empresas.ver'"
        :to="destino"
        class="font-medium underline"
      >
        Ir a la empresa
      </RouterLink>
    </div>
  </div>
</template>
