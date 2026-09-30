<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeVigenciaDeCombustible } from '../../composables/vigencias-de-combustible/edicion-de-vigencia-de-combustible';

/** Los campos de la tasa; `aviso` explica que registrarla cierra la vigente. El combustible lo fija la ventana. */
defineProps<{ errores: Record<string, string>; aviso: string | null }>();
const edicion = defineModel<EdicionDeVigenciaDeCombustible>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.idpPorGalon"
        etiqueta="IDP por galón (Q)"
        tipo="number"
        paso="0.01"
        requerido
        :error="errores.idpPorGalon"
      />
      <CampoTexto
        v-model="edicion.porcentajeDeEtanol"
        etiqueta="Porcentaje de etanol (%)"
        tipo="number"
        paso="0.01"
        requerido
        :error="errores.porcentajeDeEtanol"
      />
      <CampoTexto
        v-model="edicion.vigenteDesde"
        etiqueta="Vigente desde"
        tipo="date"
        requerido
        :error="errores.vigenteDesde"
      />
      <CampoTexto v-model="edicion.vigenteHasta" etiqueta="Vigente hasta" tipo="date" :error="errores.vigenteHasta" />
    </div>
    <p class="text-xs text-tierra-600 dark:text-tierra-300">
      Deje «Vigente hasta» vacío si es la tasa actual. Una tasa de Q0.00 sirve para una exención temporal.
    </p>
    <p
      v-if="aviso"
      role="status"
      class="rounded-lg bg-trigo-300/30 px-3 py-2 text-sm text-tierra-800 dark:bg-trigo-500/15 dark:text-tierra-100"
    >
      {{ aviso }}
    </p>
  </div>
</template>
