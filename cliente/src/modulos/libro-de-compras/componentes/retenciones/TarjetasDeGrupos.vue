<script setup lang="ts">
import { CircleDollarSign, TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { prefijoDelPlazo, sePuedePagar, tonoDelEstado } from '../../composables/retenciones/datos-de-retenciones';
import type { GrupoDelMes } from '../../servicios/retenciones.api';
import { NOMBRES_DE_ESTADOS } from '../../textos-de-retenciones';
import CifrasDelGrupo from './CifrasDelGrupo.vue';

/** Una tarjeta por grupo de entero: lo retenido, pagado, el plazo, el estado y el atajo para registrar el pago. */
defineProps<{ grupos: GrupoDelMes[] }>();
defineEmits<{ pagar: [grupo: GrupoDelMes] }>();
</script>

<template>
  <ul class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Grupos de entero del mes">
    <li
      v-for="grupo in grupos"
      :key="grupo.grupo"
      class="flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-4 ring-1 dark:bg-tierra-800/60"
      :class="
        grupo.estado === 'vencido' ? 'ring-2 ring-red-500 dark:ring-red-500' : 'ring-tierra-200/70 dark:ring-tierra-700'
      "
    >
      <div class="flex items-start justify-between gap-2">
        <h2 class="min-w-0 text-sm font-semibold">{{ grupo.nombre }}</h2>
        <InsigniaBase :tono="tonoDelEstado(grupo.estado)">{{ NOMBRES_DE_ESTADOS[grupo.estado] }}</InsigniaBase>
      </div>
      <CifrasDelGrupo :grupo="grupo" />
      <p v-if="grupo.estado !== 'sin_retenciones'" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ prefijoDelPlazo(grupo.estado) }} <strong>{{ formatearFecha(grupo.plazo) }}</strong>
      </p>
      <p
        v-if="grupo.sinConstancia.cantidad + grupo.conConstancia.cantidad > 0"
        class="text-xs text-tierra-600 dark:text-tierra-300"
      >
        {{ grupo.conConstancia.cantidad }} con constancia, {{ grupo.sinConstancia.cantidad }} sin constancia
      </p>
      <p
        v-if="grupo.aviso"
        class="flex items-start gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {{ grupo.aviso }}
      </p>
      <BotonBase
        v-if="sePuedePagar(grupo)"
        v-permiso="'libro-de-compras.retenciones.enterar'"
        class="mt-auto print:hidden"
        variante="secundario"
        :icono="CircleDollarSign"
        @click="$emit('pagar', grupo)"
      >
        Registrar pago
      </BotonBase>
    </li>
  </ul>
</template>
