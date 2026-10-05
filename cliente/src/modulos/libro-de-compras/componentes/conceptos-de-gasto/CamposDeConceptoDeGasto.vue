<script setup lang="ts">
import { watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { TEXTOS_FISCALES } from '../../textos';
import { OPCIONES_DE_TIPO_POR_OMISION } from '../../composables/conceptos-de-gasto/edicion-de-concepto-de-gasto';
import type { EdicionDeConceptoDeGasto } from '../../composables/conceptos-de-gasto/edicion-de-concepto-de-gasto';
import {
  ajustarTipoSegunActivoFijo,
  tipoBloqueado,
} from '../../composables/conceptos-de-gasto/reglas-de-concepto-de-gasto';

/** Los campos del concepto de gasto; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeConceptoDeGasto>({ required: true });

watch(
  () => edicion.value.esActivoFijo,
  () => ajustarTipoSegunActivoFijo(edicion.value),
  { immediate: true },
);
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <div class="space-y-1.5">
      <CampoSelector
        v-model="edicion.tipoPorOmision"
        etiqueta="Tipo por omisión"
        :opciones="opcionesDeLista(OPCIONES_DE_TIPO_POR_OMISION, false)"
        :deshabilitado="tipoBloqueado(edicion)"
        requerido
        :error="errores.tipoPorOmision"
      />
      <p v-if="tipoBloqueado(edicion)" class="text-xs text-tierra-600 dark:text-tierra-300">
        Un activo fijo siempre es un bien, por eso el tipo no se puede cambiar. Desmarque «Activo fijo» para elegir
        otro.
      </p>
      <p v-else class="text-xs text-tierra-600 dark:text-tierra-300">
        Es el tipo que se propone en cada línea de la compra; ahí se puede corregir.
      </p>
    </div>
    <CampoInterruptor
      v-model="edicion.esProductoAgropecuario"
      etiqueta="Producto agropecuario"
      :descripcion="TEXTOS_FISCALES.productoAgropecuarioAyuda"
    />
    <CampoInterruptor
      v-model="edicion.esActivoFijo"
      etiqueta="Activo fijo"
      descripcion="Maquinaria, equipo o construcciones que se usan por años. Se propone como activo fijo en la compra."
    />
  </div>
</template>
