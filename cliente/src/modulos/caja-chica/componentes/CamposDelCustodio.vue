<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeUsuarios } from '../composables/fondos/opciones-de-fondos';
import type { UsuarioParaElFondo } from '../servicios/catalogos.api';

/** Quién tiene el dinero: un usuario del sistema o solo un nombre (alguien que no entra al sistema). */
const props = defineProps<{
  usuarios: readonly UsuarioParaElFondo[];
  errores: Record<string, string>;
}>();
const custodio = defineModel<string>('custodio', { required: true });
const usuarioId = defineModel<string | null>('usuarioId', { required: true });

const opciones = computed(() => opcionesDeUsuarios(props.usuarios, 'Solo escribir el nombre'));
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-if="usuarios.length > 0"
      v-model="usuarioId"
      etiqueta="Custodio: usuario del sistema"
      :opciones="opciones"
      :error="errores.custodioUsuarioId"
    />
    <CampoTexto
      v-model="custodio"
      etiqueta="Custodio: nombre"
      :requerido="!usuarioId"
      :longitud-maxima="150"
      :ayuda="
        usuarioId
          ? 'Con un usuario elegido se usa su nombre; este campo no hace falta.'
          : 'Quién tiene el dinero. Escriba el nombre completo.'
      "
      :error="errores.custodio"
    />
  </div>
</template>
