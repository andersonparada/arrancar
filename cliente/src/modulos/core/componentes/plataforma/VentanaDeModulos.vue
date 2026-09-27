<script setup lang="ts">
import { requisitosDe } from '../../composables/plataforma/alta-de-cuenta';
import type { EstadoModulo } from '../../servicios/plataforma.api';
import CampoInterruptor from '../CampoInterruptor.vue';
import VentanaModal from '../VentanaModal.vue';

/** Los esenciales se muestran encendidos y no se pueden apagar. */
defineProps<{ abierta: boolean; cuenta: string; modulos: EstadoModulo[]; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; cambiar: [modulo: EstadoModulo, activar: boolean] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="`Módulos de ${cuenta}`" @cerrar="emit('cerrar')">
    <ul class="divide-y divide-tierra-100 dark:divide-tierra-800">
      <li v-for="modulo in modulos" :key="modulo.clave" class="py-3">
        <CampoInterruptor
          :model-value="modulo.activo"
          :etiqueta="modulo.nombre + (modulo.esencial ? ' (esencial)' : '')"
          :descripcion="`${modulo.descripcion} ${requisitosDe(modulo, modulos)}`.trim()"
          :deshabilitado="modulo.esencial || enviando"
          @update:model-value="emit('cambiar', modulo, $event)"
        />
      </li>
    </ul>
  </VentanaModal>
</template>
