<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

defineProps<{ abierta: boolean; esNueva: boolean; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const nombre = defineModel<string>('nombre', { required: true });
const activo = defineModel<boolean>('activo', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="esNueva ? 'Nueva categoría' : 'Editar categoría'" @cerrar="emit('cerrar')">
    <form id="form-categoria" class="space-y-4" @submit.prevent="emit('guardar')">
      <CampoTexto v-model="nombre" etiqueta="Nombre" requerido placeholder="Veterinaria" :error="errores.nombre" />
      <CampoInterruptor
        v-if="!esNueva"
        v-model="activo"
        etiqueta="Activa"
        descripcion="Una categoría inactiva ya no se ofrece al registrar proveedores."
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-categoria" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
