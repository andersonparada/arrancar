<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import { NOMBRES_DE_ESTADO, nombreDelTipoDeCorreo } from '../../composables/correo/servidor-de-correo';
import type { BandejaDeSoporte, EstadoDelCorreo } from '../../servicios/correo-de-soporte.api';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

/** El estado de la bandeja de todas las empresas: cuántos correos hay en cada estado y los últimos fallidos. */
defineProps<{ bandeja: BandejaDeSoporte; cargando: boolean }>();
const emit = defineEmits<{ actualizar: [] }>();
const ESTADOS = Object.keys(NOMBRES_DE_ESTADO) as EstadoDelCorreo[];
</script>

<template>
  <TarjetaBase class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-semibold">Bandeja de la instalación</h2>
      <BotonBase variante="fantasma" pequeno :icono="RefreshCw" :cargando="cargando" @click="emit('actualizar')">
        Actualizar
      </BotonBase>
    </div>
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div v-for="estado in ESTADOS" :key="estado" class="rounded-xl bg-tierra-100/70 p-3 dark:bg-tierra-800">
        <dt class="text-xs text-tierra-500">{{ NOMBRES_DE_ESTADO[estado] }}</dt>
        <dd class="text-xl font-semibold tabular-nums">{{ bandeja.conteos[estado] }}</dd>
      </div>
    </dl>
    <p v-if="bandeja.pendienteMasAntiguoDesde" class="text-sm text-tierra-600 dark:text-tierra-300">
      El pendiente más antiguo espera desde {{ formatearFechaHora(bandeja.pendienteMasAntiguoDesde) }}. Si es mucho
      tiempo, revise que el servidor esté activo y la última prueba.
    </p>
    <div v-if="bandeja.fallidosRecientes.length">
      <h3 class="mb-2 text-sm font-medium">Fallidos recientes</h3>
      <ul class="divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
        <li
          v-for="fallido in bandeja.fallidosRecientes"
          :key="fallido.id"
          class="flex flex-wrap items-center gap-2 py-2"
        >
          <span class="font-medium">{{ fallido.empresa }}</span>
          <span class="text-tierra-600 dark:text-tierra-300">{{ nombreDelTipoDeCorreo(fallido.tipo) }}</span>
          <InsigniaBase tono="rojo">{{ fallido.codigo ?? 'sin código' }}</InsigniaBase>
          <span class="text-xs text-tierra-500">
            {{ fallido.intentos }} intentos · {{ formatearFechaHora(fallido.creadoEn) }}
            <template v-if="fallido.contenidoDepurado"> · contenido ya depurado</template>
          </span>
        </li>
      </ul>
    </div>
    <p v-else class="text-sm text-tierra-500">No hay correos fallidos.</p>
  </TarjetaBase>
</template>
