<script setup lang="ts">
import { computed, useId } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { GrupoDeDocumento } from '../../composables/bandeja/lineas-de-bandeja';
import { estadoDelDocumento } from '../../composables/bandeja/seleccion-de-lineas';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import FilaDeLineaDeBandeja from './FilaDeLineaDeBandeja.vue';

/** Las líneas de un documento del libro; el casillero del encabezado elige o quita todas sus líneas. */
const props = defineProps<{ grupo: GrupoDeDocumento; seleccion: string[] }>();
const emit = defineEmits<{ alternar: [lineaId: string]; alternarDocumento: []; descartar: [linea: LineaDeBandeja] }>();
const id = useId();
const estado = computed(() => estadoDelDocumento(props.grupo, props.seleccion));
</script>

<template>
  <TarjetaBase :aria-labelledby="id">
    <div class="flex items-start gap-3">
      <input
        v-permiso="'activos-fijos.costos.crear'"
        type="checkbox"
        class="mt-0.5 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        :checked="estado === 'todas'"
        :indeterminate="estado === 'algunas'"
        :aria-label="`Elegir todas las líneas de ${grupo.titulo}`"
        @change="emit('alternarDocumento')"
      />
      <div class="min-w-0">
        <h2 :id="id" class="font-semibold wrap-break-word">{{ grupo.titulo }}</h2>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ grupo.proveedorNombre }} · {{ formatearFecha(grupo.fechaEmision) }}
        </p>
      </div>
    </div>
    <div
      class="mt-2 divide-y divide-tierra-200 border-t border-tierra-200 dark:divide-tierra-700 dark:border-tierra-700"
    >
      <FilaDeLineaDeBandeja
        v-for="linea in grupo.lineas"
        :key="linea.lineaId"
        :linea="linea"
        :elegida="seleccion.includes(linea.lineaId)"
        @alternar="emit('alternar', linea.lineaId)"
        @descartar="emit('descartar', linea)"
      />
    </div>
  </TarjetaBase>
</template>
