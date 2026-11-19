<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { TEXTO_DE_LISTA_INCOMPLETA } from '../composables/pagos/paginas-de-proveedores';

/** A quién se paga: el selector de proveedores con algo por pagar, que busca en el servidor si son demasiados. */
defineProps<{
  opciones: OpcionBuscable<string>[];
  /** Hay más proveedores de los que caben en la lista: el selector busca en el servidor al escribir. */
  incompleta: boolean;
  /** Ya terminó de cargar y no hay ningún proveedor con algo por pagar. */
  sinProveedores: boolean;
  error?: string;
}>();
const proveedorId = defineModel<string>({ required: true });
const emit = defineEmits<{ buscar: [texto: string] }>();
</script>

<template>
  <TarjetaBase>
    <CampoSelector
      v-model="proveedorId"
      etiqueta="Proveedor"
      requerido
      :opciones="opciones"
      :busqueda-en-servidor="incompleta"
      :error="error"
      @buscar="emit('buscar', $event)"
    />
    <p v-if="incompleta" class="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">
      {{ TEXTO_DE_LISTA_INCOMPLETA }}
    </p>
    <p v-if="sinProveedores" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">
      Ningún proveedor tiene documentos autorizados por pagar. Autorícelos en Documentos por pagar y entréguelos en una
      contraseña.
    </p>
  </TarjetaBase>
</template>
