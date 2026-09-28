<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ResumenDeConciliacion } from '../../composables/conciliaciones/calculo-de-conciliacion';

/** El resumen en vivo de la conciliación: saldo anterior, saldo conciliado, saldo según banco y la diferencia. */
const props = defineProps<{
  saldoAnterior: string;
  resumen: ResumenDeConciliacion;
  cerrada: boolean;
  guardando: boolean;
  errores: Record<string, string>;
}>();
const emit = defineEmits<{ 'guardar-saldo': []; cerrar: [] }>();
const saldoSegunBanco = defineModel<string>('saldoSegunBanco', { required: true });

const diferenciaEsCero = computed(() => props.resumen.diferencia === '0.00');
</script>

<template>
  <TarjetaBase class="space-y-3">
    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-xs text-tierra-500">Saldo anterior</dt>
        <dd class="font-medium">{{ formatearMonto(saldoAnterior) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Saldo conciliado</dt>
        <dd class="font-medium">{{ formatearMonto(resumen.saldoConciliado) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Diferencia</dt>
        <dd
          class="font-semibold"
          :class="diferenciaEsCero ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        >
          {{ formatearMonto(resumen.diferencia) }}
        </dd>
      </div>
      <div>
        <CampoTexto
          v-model="saldoSegunBanco"
          etiqueta="Saldo según el banco"
          tipo="number"
          paso="any"
          :solo-lectura="cerrada"
          :error="errores.saldoSegunBanco"
          @change="emit('guardar-saldo')"
        />
      </div>
    </dl>
    <div v-if="!cerrada" class="flex justify-end">
      <BotonBase :cargando="guardando" :deshabilitado="!diferenciaEsCero" @click="emit('cerrar')">
        Cerrar conciliación
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
