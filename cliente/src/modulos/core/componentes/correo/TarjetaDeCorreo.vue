<script setup lang="ts">
import { Paperclip } from 'lucide-vue-next';
import {
  fechaDelEstado,
  nombreDelEstado,
  resumenDeDestinatarios,
  tonoDelEstado,
} from '../../composables/correo/estado-del-correo';
import { nombreDelTipoDeCorreo } from '../../composables/correo/servidor-de-correo';
import type { CorreoResumen } from '../../servicios/correos.api';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

/** Un correo en la lista del historial: asunto, a quién, cómo va y cuándo. Toda la tarjeta abre su ficha. */
defineProps<{ correo: CorreoResumen }>();
const emit = defineEmits<{ abrir: [] }>();
</script>

<template>
  <button
    type="button"
    class="block h-full w-full rounded-2xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    @click="emit('abrir')"
  >
    <TarjetaBase class="flex h-full flex-col gap-2">
      <div class="flex items-start justify-between gap-2">
        <p class="min-w-0 font-semibold break-words">{{ correo.asunto }}</p>
        <InsigniaBase :tono="tonoDelEstado(correo.estado)" class="shrink-0">{{ nombreDelEstado(correo) }}</InsigniaBase>
      </div>
      <p class="text-sm break-all">{{ resumenDeDestinatarios(correo) }}</p>
      <p class="mt-auto flex flex-wrap items-center gap-x-3 text-xs text-tierra-500">
        <span>{{ nombreDelTipoDeCorreo(correo.tipo) }}</span>
        <span>{{ fechaDelEstado(correo) }}</span>
        <span v-if="correo.adjuntoNombre" class="inline-flex items-center gap-1">
          <Paperclip class="size-3" aria-hidden="true" />PDF
        </span>
      </p>
    </TarjetaBase>
  </button>
</template>
