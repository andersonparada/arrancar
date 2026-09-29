<script setup lang="ts">
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeDepartamento } from '../../composables/departamentos/edicion-de-departamento';
import CamposDeDepartamento from './CamposDeDepartamento.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  conflicto?: string;
  referencias: Record<'localidadId', OpcionDeRegistro[]>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeDepartamento>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar departamento' : 'Nuevo departamento'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-departamento" @submit.prevent="emit('guardar')">
      <p
        v-if="conflicto"
        role="alert"
        class="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      >
        {{ conflicto }}
      </p>
      <CamposDeDepartamento v-model="edicion" :errores="errores" :referencias="referencias" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-departamento" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
