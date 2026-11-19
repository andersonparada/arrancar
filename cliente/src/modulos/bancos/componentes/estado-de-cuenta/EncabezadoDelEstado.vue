<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';

/** El encabezado del documento: empresa, banco, cuenta, rango y la leyenda fija (pantalla e impresión). */
defineProps<{
  empresa: string | null;
  banco: string | null;
  cuenta: string;
  numero: string;
  desde: string;
  hasta: string;
}>();
</script>

<template>
  <TarjetaBase class="print:shadow-none print:ring-0">
    <h2 class="text-lg font-semibold">Estado de cuenta</h2>
    <dl class="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt class="text-xs text-tierra-500">Empresa</dt>
        <dd>{{ formatearTexto(empresa) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Banco</dt>
        <dd>{{ formatearTexto(banco) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Cuenta</dt>
        <dd class="break-words">{{ cuenta }} · {{ numero }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Periodo</dt>
        <dd>{{ formatearFecha(desde) }} — {{ formatearFecha(hasta) }}</dd>
      </div>
    </dl>
    <p class="mt-3 text-xs font-medium text-tierra-600 dark:text-tierra-300">
      Documento interno, no sustituye el estado de cuenta del banco.
    </p>
  </TarjetaBase>
</template>
