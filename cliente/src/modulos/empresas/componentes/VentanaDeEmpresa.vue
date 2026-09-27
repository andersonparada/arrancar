<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeEmpresa } from '../composables/edicion-de-empresa';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeEmpresa>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.empresaId ? 'Editar empresa' : 'Nueva empresa'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-empresa" class="space-y-4" @submit.prevent="emit('guardar')">
      <CampoTexto
        v-model="edicion.nombre"
        etiqueta="Nombre"
        placeholder="Ej. Rancho San José"
        requerido
        :error="errores.nombre"
      />
      <CampoTexto v-model="edicion.nit" etiqueta="NIT" placeholder="Ej. 1234567-8" :error="errores.nit" />
      <CampoTexto v-model="edicion.direccion" etiqueta="Dirección" :error="errores.direccion" />
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.telefono" etiqueta="Teléfono" tipo="tel" :error="errores.telefono" />
        <CampoTexto v-model="edicion.correo" etiqueta="Correo" tipo="email" :error="errores.correo" />
      </div>
      <CampoInterruptor
        v-if="edicion.empresaId"
        v-model="edicion.activa"
        etiqueta="Empresa activa"
        descripcion="Una empresa desactivada no aparece en el selector."
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-empresa" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
