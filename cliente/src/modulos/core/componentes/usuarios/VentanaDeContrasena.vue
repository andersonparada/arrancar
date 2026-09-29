<script setup lang="ts">
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';

defineProps<{
  abierta: boolean;
  nombre: string;
  pideLaActual: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const contrasena = defineModel<string>('contrasena', { required: true });
const contrasenaActual = defineModel<string>('contrasenaActual', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Cambiar contraseña" @cerrar="emit('cerrar')">
    <form id="form-contrasena" class="space-y-4" @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600">
        Nueva contraseña para <strong>{{ nombre }}</strong
        >. Se cerrarán sus sesiones abiertas.
      </p>
      <CampoTexto
        v-if="pideLaActual"
        v-model="contrasenaActual"
        etiqueta="Contraseña actual"
        tipo="password"
        autocompletar="current-password"
        requerido
        :error="errores.contrasenaActual"
      />
      <CampoTexto
        v-model="contrasena"
        etiqueta="Nueva contraseña"
        tipo="password"
        autocompletar="new-password"
        requerido
        :error="errores.contrasena"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-contrasena" :cargando="enviando">Cambiar</BotonBase>
    </template>
  </VentanaModal>
</template>
