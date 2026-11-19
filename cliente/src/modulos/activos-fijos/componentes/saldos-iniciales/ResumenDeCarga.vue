<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { cifrasDelCuadre } from '../../composables/saldos-iniciales/detalles-de-saldo';
import type { ListaDeSaldosIniciales } from '../../servicios/saldos-iniciales.api';

/** El cuadre de la carga: la fecha de corte, el estado de la carga y los totales para compararlos con el balance. */
defineProps<{ lista: ListaDeSaldosIniciales }>();
</script>

<template>
  <TarjetaBase class="space-y-4" aria-labelledby="titulo-del-cuadre">
    <div class="flex flex-wrap items-center gap-2">
      <h2 id="titulo-del-cuadre" class="text-sm font-semibold">
        {{ lista.totales.activos }} {{ lista.totales.activos === 1 ? 'activo' : 'activos' }} de saldo inicial
        <template v-if="lista.fechaDeCorte">al {{ formatearFecha(lista.fechaDeCorte) }}</template>
      </h2>
      <InsigniaBase :tono="lista.cargaCerrada ? 'tierra' : 'campo'">
        {{ lista.cargaCerrada ? 'Carga cerrada' : 'Carga abierta' }}
      </InsigniaBase>
    </div>
    <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
      <div v-for="cifra in cifrasDelCuadre(lista.totales)" :key="cifra.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
        <dd class="mt-0.5 font-semibold tabular-nums">{{ cifra.valor }}</dd>
      </div>
    </dl>
    <details v-if="lista.porClase.length" class="text-sm">
      <summary class="cursor-pointer font-medium text-campo-800 dark:text-campo-300">Ver el cuadre por clase</summary>
      <ul class="mt-2 divide-y divide-tierra-200 dark:divide-tierra-700">
        <li v-for="clase in lista.porClase" :key="clase.claseId" class="flex flex-wrap justify-between gap-x-4 py-1.5">
          <span class="font-medium">{{ clase.clase }}</span>
          <span class="tabular-nums text-tierra-600 dark:text-tierra-300">
            {{ formatearMonto(clase.costo) }} · deprec. {{ formatearMonto(clase.depreciacionAcumuladaContable) }}
          </span>
        </li>
      </ul>
    </details>
  </TarjetaBase>
</template>
