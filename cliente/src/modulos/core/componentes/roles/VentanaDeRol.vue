<script setup lang="ts">
import type { EdicionDeRol } from '../../composables/roles/edicion-de-rol';
import type { GrupoPermisos } from '../../servicios/roles.api';
import BotonBase from '../BotonBase.vue';
import CampoInterruptor from '../CampoInterruptor.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';
import SelectorDePermisos from './SelectorDePermisos.vue';

defineProps<{ catalogo: GrupoPermisos[]; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeRol>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.rolId ? 'Editar rol' : 'Nuevo rol'"
    ancha
    @cerrar="emit('cerrar')"
  >
    <form id="form-rol" class="space-y-5" @submit.prevent="emit('guardar')">
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
        <CampoTexto v-model="edicion.descripcion" etiqueta="Descripción" :error="errores.descripcion" />
      </div>
      <CampoInterruptor
        v-model="edicion.accesoTotal"
        etiqueta="Acceso total"
        descripcion="Tiene todos los permisos, incluidos los de módulos que se activen en el futuro."
      />
      <SelectorDePermisos v-if="!edicion.accesoTotal" v-model="edicion.permisos" :catalogo="catalogo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-rol" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
