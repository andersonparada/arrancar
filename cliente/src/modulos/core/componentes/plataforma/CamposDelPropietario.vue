<script setup lang="ts">
import type { FormularioDeAlta } from '../../composables/plataforma/alta-de-cuenta';
import CampoTexto from '../CampoTexto.vue';

/** El dueño de la cuenta nueva: una persona nueva, o alguien que ya existe si se escribe su usuario. */
defineProps<{ errores: Record<string, string> }>();
const alta = defineModel<FormularioDeAlta>({ required: true });
</script>

<template>
  <fieldset class="grid gap-4 sm:grid-cols-2">
    <legend class="mb-2 text-sm font-semibold">Propietario</legend>
    <CampoTexto v-model="alta.nombres" etiqueta="Nombres" requerido :error="errores['propietario.nombres']" />
    <CampoTexto v-model="alta.apellidos" etiqueta="Apellidos" :error="errores['propietario.apellidos']" />
    <CampoTexto
      v-model="alta.usuario"
      etiqueta="Usuario (opcional)"
      sin-correccion
      ayuda="Vacío: se genera a partir del nombre. Si escribe uno que ya existe, esa persona será la propietaria."
      :error="errores['propietario.usuario']"
    />
    <CampoTexto
      v-model="alta.correo"
      etiqueta="Correo (opcional)"
      tipo="email"
      :error="errores['propietario.correo']"
    />
    <CampoTexto
      v-model="alta.contrasena"
      etiqueta="Contraseña inicial"
      tipo="password"
      autocompletar="new-password"
      ayuda="Obligatoria si el usuario es nuevo."
      :error="errores['propietario.contrasena']"
    />
  </fieldset>
</template>
