<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EstadoDeEdicion } from '../composables/usar-edicion-de-cuenta';
import CamposDeCuenta from './CamposDeCuenta.vue';

const props = defineProps<{
  mascara: string;
  enviando: boolean;
  errores: Record<string, string>;
  puedeEliminar: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; eliminar: [] }>();
const edicion = defineModel<EstadoDeEdicion>({ required: true });

const titulo = computed(() => {
  const { existente, padre } = edicion.value;
  if (existente) return `Editar cuenta ${existente.codigo}`;
  return padre ? `Nueva cuenta bajo ${padre.codigo} ${padre.nombre}` : 'Nueva cuenta de primer nivel';
});
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" ancha @cerrar="emit('cerrar')">
    <form id="form-cuenta" class="space-y-4" @submit.prevent="emit('guardar')">
      <CamposDeCuenta
        v-model="edicion.datos"
        :es-nueva="!edicion.existente"
        :tiene-superior="edicion.padre !== null"
        :mascara="props.mascara"
        :errores="errores"
      />
    </form>
    <template #pie>
      <BotonBase
        v-if="edicion.existente && puedeEliminar"
        variante="peligro"
        class="mr-auto"
        :deshabilitado="enviando"
        @click="emit('eliminar')"
      >
        Eliminar
      </BotonBase>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-cuenta" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
