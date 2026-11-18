<script setup lang="ts">
import { toRef } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { resumenDeNotasMarcadas } from '../../composables/conciliaciones/notas-marcadas';
import { usarNotasMarcadas } from '../../composables/conciliaciones/usar-notas-marcadas';
import type { Conciliacion } from '../../servicios/conciliaciones.api';
import VentanaDeDesmarcar from '../notas/VentanaDeDesmarcar.vue';

/**
 * Las notas marcadas para Cuentas por pagar que aún no se aplican, a la vista de quien concilia: si una fue un error,
 * se desmarca aquí mismo (concepto y motivo). Si ya está ligada a un pago, el servidor lo rechaza y lo explica.
 */
const props = defineProps<{ conciliacion: Conciliacion }>();
const { notas, disponible, desmarcado } = usarNotasMarcadas(toRef(() => props.conciliacion));
</script>

<template>
  <TarjetaBase v-if="disponible && notas.length" class="space-y-2 print:hidden">
    <h2 class="text-sm font-semibold">Notas para Cuentas por pagar</h2>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ resumenDeNotasMarcadas(notas.length) }}</p>
    <ul class="divide-y divide-tierra-100 text-sm dark:divide-tierra-800">
      <li v-for="nota in notas" :key="nota.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        <span class="w-24 shrink-0 text-tierra-500">{{ formatearFecha(nota.fecha) }}</span>
        <span class="min-w-0 flex-1 break-words">{{ nota.referencia ?? nota.beneficiario ?? 'Nota de débito' }}</span>
        <span class="font-medium">{{ formatearMonto(nota.monto) }}</span>
        <BotonBase variante="fantasma" pequeno @click="desmarcado.abrir(nota)">Desmarcar</BotonBase>
      </li>
    </ul>
    <VentanaDeDesmarcar
      v-model:motivo="desmarcado.motivo"
      v-model:concepto-id="desmarcado.conceptoId"
      :abierta="!!desmarcado.registro"
      :opciones="desmarcado.opciones"
      :errores="desmarcado.errores"
      :enviando="desmarcado.enviando"
      @cerrar="desmarcado.cerrar"
      @confirmar="desmarcado.confirmar"
    />
  </TarjetaBase>
</template>
