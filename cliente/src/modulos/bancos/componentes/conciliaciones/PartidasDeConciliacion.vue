<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Partida, PartidasDeConciliacion } from '../../servicios/conciliaciones.api';

/** Las partidas pendientes (sin marcar) del documento, agrupadas: cheques, otros débitos y créditos en tránsito. */
defineProps<{ partidas: PartidasDeConciliacion }>();

const GRUPOS: { clave: keyof PartidasDeConciliacion; titulo: string; signo: string }[] = [
  { clave: 'chequesEnCirculacion', titulo: 'Cheques en circulación', signo: '+' },
  { clave: 'otrosDebitosEnTransito', titulo: 'Otros débitos en tránsito', signo: '+' },
  { clave: 'creditosEnTransito', titulo: 'Créditos y depósitos en tránsito', signo: '−' },
];

const descripcion = (p: Partida): string =>
  p.numeroDeCheque ? `Cheque ${p.numeroDeCheque} · ${p.beneficiario ?? ''}` : (p.beneficiario ?? p.referencia ?? '—');
</script>

<template>
  <div class="space-y-3">
    <TarjetaBase v-for="grupo in GRUPOS" :key="grupo.clave" class="space-y-2">
      <p class="text-sm font-semibold">{{ grupo.signo }} {{ grupo.titulo }}</p>
      <p v-if="!partidas[grupo.clave].length" class="text-sm text-tierra-500">Ninguno.</p>
      <ul v-else class="divide-y divide-tierra-100 text-sm dark:divide-tierra-800">
        <li v-for="p in partidas[grupo.clave]" :key="p.movimientoId" class="flex items-center gap-3 py-1.5">
          <span class="w-24 shrink-0 text-tierra-500">{{ formatearFecha(p.fecha) }}</span>
          <span class="min-w-0 flex-1 truncate">{{ descripcion(p) }}</span>
          <span class="font-medium">{{ formatearMonto(p.monto) }}</span>
        </li>
      </ul>
    </TarjetaBase>
  </div>
</template>
