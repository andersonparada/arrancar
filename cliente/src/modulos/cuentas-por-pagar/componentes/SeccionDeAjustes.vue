<script setup lang="ts">
import { Ban } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearFechaHora, formatearMonto } from '@/modulos/core/utilidades/formato';
import { resumenDeAnularAjuste } from '../composables/aplicaciones-de-la-ficha';
import type { AjusteDelDocumento } from '../servicios/tipos';
import { CAUSAS_DE_AJUSTE, EFECTOS_DEL_AJUSTE } from '../textos';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** Los ajustes del saldo a favor de una nota, también los anulados; los vigentes se pueden anular con un motivo. */
defineProps<{ ajustes: AjusteDelDocumento[] }>();
defineEmits<{ anular: [id: string, resumen: string] }>();
</script>

<template>
  <SeccionDeFicha v-if="ajustes.length" :titulo="`Ajustes del saldo (${ajustes.length})`">
    <ul class="space-y-2">
      <li v-for="ajuste in ajustes" :key="ajuste.id">
        <TarjetaBase class="space-y-2 text-sm" :class="ajuste.estado === 'anulado' ? 'opacity-75' : ''">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium"> {{ formatearMonto(ajuste.monto) }} · {{ CAUSAS_DE_AJUSTE[ajuste.causa] }} </span>
            <span class="flex items-center gap-2">
              <InsigniaBase>{{ EFECTOS_DEL_AJUSTE[ajuste.efecto] }}</InsigniaBase>
              <InsigniaBase :tono="ajuste.estado === 'vigente' ? 'campo' : 'rojo'">
                {{ ajuste.estado === 'vigente' ? 'Vigente' : 'Anulado' }}
              </InsigniaBase>
            </span>
          </div>
          <p class="text-tierra-600 dark:text-tierra-300">
            {{ formatearFecha(ajuste.fecha) }} · {{ ajuste.motivo }}
            <template v-if="ajuste.referencia"> · Referencia: {{ ajuste.referencia }}</template>
          </p>
          <p class="text-xs text-tierra-500">
            Registrado por {{ ajuste.creadoPor ?? 'un usuario' }} el {{ formatearFechaHora(ajuste.creadoEn) }}
          </p>
          <p v-if="ajuste.anulacion" class="text-xs text-red-700 dark:text-red-400">
            Anulado por {{ ajuste.anulacion.anuladoPorNombre ?? 'un usuario' }}
            <template v-if="ajuste.anulacion.anuladoEn">
              el {{ formatearFechaHora(ajuste.anulacion.anuladoEn) }}</template
            >
            : {{ ajuste.anulacion.motivo }}
          </p>
          <BotonBase
            v-if="ajuste.puedeAnular"
            v-permiso="'cuentas-por-pagar.ajustes.anular'"
            variante="secundario"
            pequeno
            :icono="Ban"
            @click="$emit('anular', ajuste.id, resumenDeAnularAjuste(ajuste))"
          >
            Anular el ajuste
          </BotonBase>
        </TarjetaBase>
      </li>
    </ul>
  </SeccionDeFicha>
</template>
