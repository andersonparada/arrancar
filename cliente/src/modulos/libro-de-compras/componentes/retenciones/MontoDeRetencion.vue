<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import type { RetencionDelMes } from '../../servicios/retenciones.api';

/** Lo retenido; si el usuario la dejó en cero, se marca y se dice lo que se había propuesto y por qué. */
defineProps<{ retencion: RetencionDelMes }>();
</script>

<template>
  <div>
    <p class="font-semibold tabular-nums">{{ formatearMonto(retencion.retenido) }}</p>
    <template v-if="retencion.enCero">
      <InsigniaBase tono="trigo">En cero: no se retuvo</InsigniaBase>
      <p class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
        Se proponía {{ formatearMonto(retencion.propuesto) }}
        <template v-if="retencion.motivoDelAjuste">: {{ retencion.motivoDelAjuste }}</template>
      </p>
    </template>
    <p v-else-if="retencion.motivoDelAjuste" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
      Ajustada: {{ retencion.motivoDelAjuste }}
    </p>
  </div>
</template>
