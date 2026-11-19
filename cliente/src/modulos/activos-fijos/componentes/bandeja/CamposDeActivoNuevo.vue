<script setup lang="ts">
import { computed, watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { alCambiarLasUnidades, type EdicionDeActivoNuevo } from '../../composables/bandeja/edicion-de-capitalizacion';
import { textoDeCostoPorUnidad } from '../../composables/bandeja/textos-de-bandeja';
import type { Clase } from '../../servicios/clases.api';

/**
 * Lo que se escribe del activo nuevo (o de los N activos iguales) que nace de una parte de la línea: qué es, su
 * clase, cuántas unidades y piezas, y lo propio del inciso fiscal. La ubicación y la cuadrícula van aparte.
 */
const props = defineProps<{
  errores: Record<string, string>;
  clases: OpcionDeRegistro[];
  inciso: Clase['incisoFiscal'] | null;
  /** El monto de esta parte, para mostrar el costo por unidad. */
  monto: string | number;
}>();
const nuevo = defineModel<EdicionDeActivoNuevo>({ required: true });
const noEsEdificacion = defineModel<boolean>('noEsEdificacion', { required: true });

const TIPOS = [
  { valor: 'activo', texto: 'Activo fijo (del balance)' },
  { valor: 'bien_de_control', texto: 'Bien de control (se va a gasto)' },
] as const;

watch(
  () => nuevo.value.unidades,
  () => alCambiarLasUnidades(nuevo.value),
);
const costoPorUnidad = computed(() =>
  textoDeCostoPorUnidad(props.monto, Number(nuevo.value.unidades), Number(nuevo.value.cantidadPorActivo)),
);
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      v-model="nuevo.descripcion"
      etiqueta="Descripción"
      requerido
      :longitud-maxima="200"
      :error="errores.descripcion"
    />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoSelector v-model="nuevo.claseId" etiqueta="Clase" :opciones="clases" requerido :error="errores.claseId" />
      <CampoSelector v-model="nuevo.tipoDeRegistro" etiqueta="Tipo de registro" :opciones="[...TIPOS]" requerido />
    </div>
    <p v-if="nuevo.tipoDeRegistro === 'bien_de_control'" class="text-xs text-tierra-600 dark:text-tierra-300">
      Un bien de control se vigila con etiqueta y ubicación, pero no se deprecia ni va al balance. En lo fiscal va al
      gasto: la ley no fija un monto mínimo y, si la SAT lo reclasifica, solo aceptaría el 20 % anual.
    </p>
    <p v-if="inciso === 'intangibles'" class="text-xs text-tierra-600 dark:text-tierra-300">
      Programas y licencias: solo la licencia comprada aparte. El programa que viene con el equipo es costo del equipo,
      y las suscripciones y servicios en la nube son gasto.
    </p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="nuevo.unidades"
        etiqueta="Unidades"
        tipo="number"
        requerido
        ayuda="Cuántos activos iguales se crean (hasta 200 por operación). Tres tractores: 3."
        :error="errores.unidades"
      />
      <CampoTexto
        v-model="nuevo.cantidadPorActivo"
        etiqueta="Cantidad por activo"
        tipo="number"
        requerido
        ayuda="Piezas que lleva cada activo. 50 sillas en un solo activo: 50."
        :error="errores.cantidadPorActivo"
      />
    </div>
    <p v-if="costoPorUnidad" class="text-sm text-tierra-700 dark:text-tierra-200" aria-live="polite">
      {{ costoPorUnidad }}
    </p>
    <div v-if="inciso === 'edificios'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="nuevo.valorDeMatricula"
        etiqueta="Valor de matrícula fiscal"
        tipo="number"
        paso="any"
        :error="errores.valorDeMatricula"
      />
      <CampoTexto
        v-model="nuevo.valorCatastral"
        etiqueta="Valor catastral municipal"
        tipo="number"
        paso="any"
        :error="errores.valorCatastral"
      />
      <CampoInterruptor
        v-model="nuevo.valoresDelInmuebleCompleto"
        etiqueta="Los valores son del inmueble completo"
        descripcion="Si no separan el terreno del edificio, el tope es el 70 % del mayor."
      />
      <CampoInterruptor
        v-model="noEsEdificacion"
        etiqueta="No es edificación ni requiere licencia"
        descripcion="Marque los costos que no son de construir el edificio."
      />
    </div>
    <CampoTexto
      v-if="inciso === 'reproductores'"
      v-model="nuevo.valorComoGanadoComun"
      etiqueta="Valor como ganado común"
      tipo="number"
      paso="any"
      requerido
      :error="errores.valorComoGanadoComun"
    />
  </div>
</template>
