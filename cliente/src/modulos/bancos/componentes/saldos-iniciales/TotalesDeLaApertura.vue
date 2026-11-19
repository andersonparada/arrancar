<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { AYUDA_DE_BANCOS_Y_SOBREGIROS } from '../../textos-de-apertura';

/** Bancos y Sobregiros bancarios al corte, cada uno por separado: no hay un total neto (NIIF para las Pymes 2.52). */
defineProps<{ totalBancos: string; totalSobregiros: string }>();
</script>

<template>
  <TarjetaBase class="mb-6 space-y-2" aria-label="Totales de la empresa al corte" role="region">
    <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <dt class="text-xs text-tierra-500">Bancos (cuentas con saldo)</dt>
        <dd class="text-xl font-semibold tabular-nums">{{ formatearMonto(totalBancos) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Sobregiros bancarios (cuentas sobregiradas)</dt>
        <dd class="text-xl font-semibold tabular-nums">{{ formatearMonto(totalSobregiros) }}</dd>
      </div>
    </dl>
    <p class="text-xs text-tierra-500">{{ AYUDA_DE_BANCOS_Y_SOBREGIROS }}</p>
  </TarjetaBase>
</template>
