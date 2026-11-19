<script setup lang="ts">
import { watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_INCISO_FISCAL } from '../../composables/clases/edicion-de-clase';
import type { EdicionDeClase } from '../../composables/clases/edicion-de-clase';
import { aplicarInciso, ayudaDeClase, esTerreno } from '../../composables/clases/reglas-de-clase';

/** Los campos de la clase de activo; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeClase>({ required: true });

watch(
  () => edicion.value.incisoFiscal,
  () => aplicarInciso(edicion.value),
);
const AYUDA_DE_TERRENOS = 'Los terrenos no se deprecian.';
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      v-model="edicion.nombre"
      etiqueta="Nombre"
      requerido
      :longitud-maxima="80"
      :ayuda="ayudaDeClase(edicion.nombre)"
      :error="errores.nombre"
    />
    <CampoSelector
      v-model="edicion.incisoFiscal"
      etiqueta="Inciso fiscal"
      :opciones="opcionesDeLista(OPCIONES_DE_INCISO_FISCAL, false)"
      requerido
      :error="errores.incisoFiscal"
    />
    <CampoTexto
      v-model="edicion.porcentajeFiscal"
      etiqueta="Porcentaje fiscal anual"
      tipo="number"
      paso="any"
      requerido
      :solo-lectura="esTerreno(edicion.incisoFiscal)"
      :ayuda="
        esTerreno(edicion.incisoFiscal)
          ? AYUDA_DE_TERRENOS
          : 'Máximo de ley según el inciso; el sistema avisa si se pasa.'
      "
      :error="errores.porcentajeFiscal"
    />
    <CampoTexto
      v-model="edicion.vidaUtilContableMeses"
      etiqueta="Vida útil contable (meses)"
      tipo="number"
      :solo-lectura="esTerreno(edicion.incisoFiscal)"
      ayuda="De 1 a 1200 meses. Si la deja vacía, cada activo indica la suya."
      :error="errores.vidaUtilContableMeses"
    />
    <CampoTexto
      v-model="edicion.valorResidualPorcentaje"
      etiqueta="Valor residual (%)"
      tipo="number"
      paso="any"
      requerido
      :error="errores.valorResidualPorcentaje"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
