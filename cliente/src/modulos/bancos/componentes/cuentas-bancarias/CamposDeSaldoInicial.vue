<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeSaldoInicial } from '../../composables/cuentas-bancarias/edicion-de-saldo-inicial';

const OPCIONES_DE_TIPO = { credito: 'Crédito', debito: 'Débito' };

/** Los campos del saldo inicial; la cuenta es fija (viene de la ficha) y no se muestra aquí. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.tipo"
      etiqueta="Tipo"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO, false)"
      requerido
      :error="errores.tipo"
    />
    <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
    <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="any" requerido :error="errores.monto" />
    <CampoTexto
      v-model="edicion.referencia"
      etiqueta="Referencia (boleta o autorización)"
      :error="errores.referencia"
    />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
  </div>
</template>
