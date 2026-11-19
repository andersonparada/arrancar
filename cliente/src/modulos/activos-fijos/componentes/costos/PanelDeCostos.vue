<script setup lang="ts">
import { Coins, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { detallesDeCosto, montoDeCosto } from '../../composables/costos/edicion-de-costo';
import type { Costo } from '../../servicios/costos.api';

/** La pestaña Costos de la ficha: lo que costó el activo, de dónde viene cada parte y cómo corregirlo. */
defineProps<{ costos: Costo[]; total: string; cargando: boolean }>();
const emit = defineEmits<{ registrar: []; anular: [costo: Costo] }>();
</script>

<template>
  <section aria-labelledby="titulo-de-costos" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <TarjetaBase class="flex-1 sm:flex-none sm:min-w-64">
        <p id="titulo-de-costos" class="text-xs text-tierra-500">Costo del activo (suma de los costos vigentes)</p>
        <p class="mt-0.5 text-xl font-semibold tabular-nums">{{ formatearMonto(total) }}</p>
      </TarjetaBase>
      <BotonBase v-permiso="'activos-fijos.costos.crear'" :icono="Plus" @click="emit('registrar')">
        Registrar un costo
      </BotonBase>
    </div>

    <p v-if="cargando && !costos.length" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!costos.length"
      :icono="Coins"
      titulo="Este activo todavía no tiene costos"
      descripcion="Los costos llegan desde «Por capitalizar» (facturas del libro de compras) o se registran a mano."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="costo in costos" :key="costo.id">
        <TarjetaDeRegistro
          :titulo="montoDeCosto(costo)"
          :detalles="detallesDeCosto(costo)"
          permiso="activos-fijos.costos.anular"
          :insignia="costo.estado === 'anulado' ? 'Anulado' : undefined"
          :class="{ 'opacity-60': costo.estado === 'anulado' }"
          sin-editar
        >
          <template #acciones-extra>
            <BotonBase
              v-if="costo.estado === 'vigente'"
              v-permiso="'activos-fijos.costos.anular'"
              variante="fantasma"
              pequeno
              @click="emit('anular', costo)"
            >
              Anular
            </BotonBase>
          </template>
        </TarjetaDeRegistro>
      </li>
    </ul>
  </section>
</template>
