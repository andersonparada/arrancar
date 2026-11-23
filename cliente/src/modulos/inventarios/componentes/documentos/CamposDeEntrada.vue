<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { ETIQUETAS_DE_CAUSA, opcionesDeEtiquetas } from '../../composables/compartido/etiquetas';
import type { EdicionDeEntrada } from '../../composables/documentos/edicion-de-documento';

/** El encabezado de una entrada manual: cuándo, dónde, por qué y con qué soporte. */
defineProps<{ errores: Record<string, string>; opcionesDeBodegas: OpcionDeRegistro[]; esDonacion: boolean }>();
const edicion = defineModel<EdicionDeEntrada>({ required: true });
const opcionesDeCausa = [{ valor: null, texto: 'Elija la causa' }, ...opcionesDeEtiquetas(ETIQUETAS_DE_CAUSA)];
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
    <CampoSelector
      v-model="edicion.bodegaId"
      etiqueta="Bodega que recibe"
      :opciones="opcionesDeBodegas"
      requerido
      :error="errores.bodegaId"
    />
    <CampoSelector
      v-model="edicion.causa"
      etiqueta="Por qué entra"
      :opciones="opcionesDeCausa"
      requerido
      :error="errores.causa"
    />
    <CampoTexto
      v-model="edicion.soporte"
      etiqueta="Soporte"
      requerido
      placeholder="Acta, boleta o número que lo respalda"
      :error="errores.soporte"
    />
    <p
      v-if="esDonacion"
      role="note"
      class="rounded-lg bg-trigo-300/30 px-3 py-2 text-sm sm:col-span-2 dark:bg-trigo-500/20"
    >
      En una donación escriba como costo el valor razonable. La NIIF pide registrarla a ese valor, con un ingreso. Sin
      factura que la respalde, ese costo puede no ser deducible al venderla o consumirla (ISR art. 21); consulte a su
      contador.
    </p>
    <div class="sm:col-span-2">
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </div>
  </div>
</template>
