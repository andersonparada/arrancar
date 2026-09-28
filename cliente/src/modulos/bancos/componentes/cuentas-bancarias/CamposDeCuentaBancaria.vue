<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO } from '../../composables/cuentas-bancarias/edicion-de-cuenta-bancaria';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeCuentaBancaria } from '../../composables/cuentas-bancarias/edicion-de-cuenta-bancaria';

/** Los campos de la cuenta bancaria; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string>; referencias: Record<'bancoId', OpcionDeRegistro[]> }>();
const edicion = defineModel<EdicionDeCuentaBancaria>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre corto" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.bancoId"
      etiqueta="Banco"
      :opciones="referencias.bancoId"
      requerido
      :error="errores.bancoId"
    />
    <CampoTexto v-model="edicion.numero" etiqueta="Número de cuenta" requerido :error="errores.numero" />
    <CampoSelector
      v-model="edicion.tipo"
      etiqueta="Tipo"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO, false)"
      requerido
      :error="errores.tipo"
    />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
