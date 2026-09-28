<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeChequera } from '../../composables/chequeras/edicion-de-chequera';

/** `opcionesDeCuenta` solo llega en la pantalla de administración: desde la ficha de la cuenta ya se sabe cuál es. */
defineProps<{ errores: Record<string, string>; opcionesDeCuenta?: OpcionDeRegistro[] }>();
const edicion = defineModel<EdicionDeChequera>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-if="opcionesDeCuenta"
      v-model="edicion.cuentaBancariaId"
      etiqueta="Cuenta"
      requerido
      :opciones="opcionesDeCuenta"
      :error="errores.cuentaBancariaId"
    />
    <CampoTexto v-model="edicion.serie" etiqueta="Serie (opcional)" :error="errores.serie" />
    <CampoTexto v-model="edicion.desde" etiqueta="Número inicial" tipo="number" requerido :error="errores.desde" />
    <CampoTexto v-model="edicion.hasta" etiqueta="Número final" tipo="number" requerido :error="errores.hasta" />
  </div>
</template>
