<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import { periodoDeConciliacion, TEXTO_DEL_ESTADO } from '../../composables/conciliaciones/detalles-de-conciliacion';
import type { Conciliacion } from '../../servicios/conciliaciones.api';

/** El encabezado del documento: empresa, cuenta, banco, periodo, estado y firmas de quién elaboró y autorizó. */
defineProps<{ conciliacion: Conciliacion }>();
</script>

<template>
  <TarjetaBase class="space-y-3 print:shadow-none print:ring-0">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="text-lg font-semibold">Conciliación bancaria · {{ periodoDeConciliacion(conciliacion) }}</h2>
      <span class="text-sm font-medium text-tierra-600 dark:text-tierra-300">
        {{ TEXTO_DEL_ESTADO[conciliacion.estado] }}
      </span>
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-xs text-tierra-500">Empresa</dt>
        <dd>{{ formatearTexto(conciliacion.empresaNombre) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Cuenta</dt>
        <dd>{{ formatearTexto(conciliacion.cuentaBancariaNombre) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Banco</dt>
        <dd>{{ formatearTexto(conciliacion.bancoNombre) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Número de cuenta</dt>
        <dd>{{ formatearTexto(conciliacion.numeroDeCuenta) }}</dd>
      </div>
    </dl>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-tierra-100 pt-3 text-sm dark:border-tierra-800">
      <div>
        <dt class="text-xs text-tierra-500">Elaboró</dt>
        <dd>
          {{ formatearTexto(conciliacion.elaboradaPorNombre) }}
          <span v-if="conciliacion.elaboradaEn" class="text-tierra-500"
            >· {{ formatearFecha(conciliacion.elaboradaEn) }}</span
          >
        </dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Autorizó</dt>
        <dd>
          {{ formatearTexto(conciliacion.autorizadaPorNombre) }}
          <span v-if="conciliacion.autorizadaEn" class="text-tierra-500"
            >· {{ formatearFecha(conciliacion.autorizadaEn) }}</span
          >
        </dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
