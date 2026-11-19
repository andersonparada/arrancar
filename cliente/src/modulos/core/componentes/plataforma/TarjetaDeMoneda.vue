<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, TriangleAlert } from 'lucide-vue-next';
import { avisoDeAtraso, textoDelCodigo } from '../../composables/plataforma/lista-de-monedas';
import type { Moneda, OpcionDelBanguat } from '../../servicios/monedas.api';
import type { EstadoDeLaSerie } from '../../servicios/tipos-de-cambio.api';
import { formatearFecha } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

const props = defineProps<{ moneda: Moneda; serie?: EstadoDeLaSerie | undefined; lista?: OpcionDelBanguat[] }>();
const emit = defineEmits<{ editar: [] }>();
const aviso = computed(() => avisoDeAtraso(props.serie));
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ moneda.nombre }}</p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ moneda.codigo }} · {{ moneda.simbolo }}</p>
      </div>
      <InsigniaBase :tono="moneda.activa ? 'campo' : 'tierra'">{{
        moneda.activa ? 'Activa' : 'Inactiva'
      }}</InsigniaBase>
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      <div class="col-span-2 min-w-0">
        <dt class="text-xs text-tierra-500">Moneda del Banguat</dt>
        <dd class="truncate">{{ textoDelCodigo(moneda, lista) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Decimales</dt>
        <dd>{{ moneda.decimales }}</dd>
      </div>
      <div v-if="serie">
        <dt class="text-xs text-tierra-500">Último tipo cargado</dt>
        <dd>{{ formatearFecha(serie.ultimaFecha) }}</dd>
      </div>
    </dl>
    <p v-if="aviso" class="flex items-start gap-1.5 text-sm font-medium text-red-700 dark:text-red-400">
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ aviso }}
    </p>
    <div v-permiso="'configuracion.monedas.editar'" class="mt-auto flex justify-end">
      <BotonBase variante="secundario" pequeno :icono="Pencil" @click="emit('editar')">Editar</BotonBase>
    </div>
  </TarjetaBase>
</template>
