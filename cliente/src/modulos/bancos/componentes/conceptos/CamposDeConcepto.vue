<script setup lang="ts">
import { computed, watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_ACTIVIDAD_DE_FLUJO, OPCIONES_DE_APLICA_A } from '../../composables/conceptos/edicion-de-concepto';
import type { EdicionDeConcepto } from '../../composables/conceptos/edicion-de-concepto';
import { admiteDatosDeIntereses, sinInteresesSiEsDebito } from '../../composables/conceptos/reglas-de-concepto';

/** Los campos del concepto; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeConcepto>({ required: true });

const admiteIntereses = computed(() => admiteDatosDeIntereses(edicion.value.aplicaA));
watch(
  () => edicion.value.aplicaA,
  () => sinInteresesSiEsDebito(edicion.value),
);

const AYUDA_DE_LA_ACTIVIDAD = 'Dónde se cuenta en el estado de flujo de efectivo; «Ninguna» si no debe contarse.';
const AYUDA_DE_LOS_INTERESES =
  'Al usarlo se piden los datos de los intereses ganados. Solo aplica a créditos o a ambos.';
const AYUDA_SIN_INTERESES = 'No disponible: los intereses se acreditan, así que el concepto debe usarse en créditos.';
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.aplicaA"
      etiqueta="Se usa en"
      :opciones="opcionesDeLista(OPCIONES_DE_APLICA_A, false)"
      requerido
      :error="errores.aplicaA"
    />
    <CampoSelector
      v-model="edicion.actividadDeFlujo"
      etiqueta="Actividad del flujo de efectivo"
      :opciones="opcionesDeLista(OPCIONES_DE_ACTIVIDAD_DE_FLUJO, false)"
      requerido
      :error="errores.actividadDeFlujo"
    />
    <p class="-mt-2 text-xs text-tierra-500">{{ AYUDA_DE_LA_ACTIVIDAD }}</p>
    <CampoTexto
      v-model="edicion.grupoDeFlujo"
      etiqueta="Grupo del flujo de efectivo"
      ayuda="Opcional: reúne conceptos parecidos en un mismo renglón del flujo."
      :error="errores.grupoDeFlujo"
    />
    <CampoInterruptor
      v-model="edicion.esCargoBancario"
      etiqueta="Lo origina el banco"
      descripcion="Lo genera el banco por su cuenta, como comisiones o intereses, no la empresa."
    />
    <CampoInterruptor
      v-model="edicion.pideDatosDeIntereses"
      etiqueta="Pide datos de intereses"
      :descripcion="admiteIntereses ? AYUDA_DE_LOS_INTERESES : AYUDA_SIN_INTERESES"
      :deshabilitado="!admiteIntereses"
    />
    <CampoInterruptor
      v-model="edicion.admiteFactura"
      etiqueta="Admite factura"
      descripcion="Permite anotar la factura que respalda el movimiento."
    />
    <CampoInterruptor
      v-model="edicion.activo"
      etiqueta="Activo"
      descripcion="Un concepto inactivo deja de ofrecerse al clasificar movimientos nuevos."
    />
  </div>
</template>
