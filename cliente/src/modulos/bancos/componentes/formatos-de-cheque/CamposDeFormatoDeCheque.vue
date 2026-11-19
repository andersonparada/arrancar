<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  conModoDeFecha,
  entradasDelFormato,
  leerCampo,
  ponerCampo,
  ponerComprobante,
  ponerSegundoRenglon,
} from '../../composables/formatos-de-cheque/campos-del-formato';
import type { EdicionDeFormatoDeCheque } from '../../composables/formatos-de-cheque/edicion-de-formato-de-cheque';
import type { ClaveDePlantilla, FormatoDeCheque, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';
import CampoDeMedida from './CampoDeMedida.vue';
import EditorDeCampo from './EditorDeCampo.vue';
import EsquemaDelFormato from './EsquemaDelFormato.vue';

/**
 * Todo lo que se arma de un formato: nombre, plantilla de fábrica de la que parte, papel, calibración de la impresora,
 * modo de la fecha y el lugar de cada campo. El esquema de arriba se mueve con lo que se escribe.
 */
const props = defineProps<{
  errores: Record<string, string>;
  problemas: string[];
  plantillas: PlantillaDeCheque[];
}>();
const emit = defineEmits<{ 'cambiar-base': [base: ClaveDePlantilla] }>();
const edicion = defineModel<EdicionDeFormatoDeCheque>({ required: true });

const formato = computed(() => edicion.value.formato);
const opcionesDeBase = computed(() => props.plantillas.map((p) => ({ valor: p.clave, texto: p.nombre })));
const descripcionDeBase = computed(() => props.plantillas.find((p) => p.clave === edicion.value.base)?.descripcion);
const entradas = computed(() => (formato.value ? entradasDelFormato(formato.value) : []));
const MODOS = [
  { valor: 'texto' as const, texto: 'En texto (por ejemplo, «Guatemala, 18 de noviembre de 2026»)' },
  { valor: 'casillas' as const, texto: 'En casillas (día, mes y año por separado)' },
];
const GRUPOS = [
  { grupo: 'fecha', titulo: 'Fecha' },
  { grupo: 'cheque', titulo: 'Beneficiario y montos' },
  { grupo: 'leyendas', titulo: 'Leyendas' },
  { grupo: 'talon', titulo: 'Talón (lo que conserva la empresa)' },
] as const;

function cambiarModo(modo: FormatoDeCheque['fecha']['modo'] | undefined): void {
  if (formato.value && modo) edicion.value.formato = conModoDeFecha(formato.value, modo);
}
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      v-model="edicion.nombre"
      etiqueta="Nombre del formato"
      requerido
      :longitud-maxima="80"
      :error="errores.nombre"
    />
    <CampoSelector
      :model-value="edicion.base"
      etiqueta="Plantilla de fábrica de la que parte"
      :opciones="opcionesDeBase"
      @update:model-value="$event && emit('cambiar-base', $event)"
    />
    <p v-if="descripcionDeBase" class="-mt-2 text-xs text-tierra-600 dark:text-tierra-300">{{ descripcionDeBase }}</p>
    <p class="rounded-lg bg-trigo-300/30 p-3 text-xs text-tierra-800 dark:bg-trigo-500/10 dark:text-trigo-300">
      Cambiar la plantilla reemplaza todas las medidas por las de la nueva. Las medidas son aproximadas: imprima la
      prueba de alineación en una hoja en blanco y póngala sobre un cheque contra la luz antes de gastar uno real.
    </p>

    <p v-if="!formato" class="text-sm text-tierra-500" role="status">Cargando las plantillas…</p>
    <template v-else>
      <ul
        v-if="problemas.length"
        class="list-disc space-y-1 rounded-lg bg-red-50 p-3 pl-7 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        <li v-for="problema in problemas" :key="problema">{{ problema }}</li>
      </ul>
      <EsquemaDelFormato :formato="formato" />

      <fieldset class="space-y-3 rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700">
        <legend class="px-1 text-sm font-semibold">Papel y calibración</legend>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CampoDeMedida v-model="formato.papel.anchoMm" etiqueta="Ancho del papel (mm)" />
          <CampoDeMedida v-model="formato.papel.altoMm" etiqueta="Alto del papel (mm)" />
          <CampoDeMedida v-model="formato.letra.tamanoPt" etiqueta="Letra (pt)" ayuda="Solo monoespaciada." />
          <span class="hidden sm:block" />
          <CampoDeMedida
            v-model="formato.desplazamiento.xMm"
            etiqueta="Mover a la derecha (mm)"
            ayuda="Negativo: a la izquierda."
          />
          <CampoDeMedida
            v-model="formato.desplazamiento.yMm"
            etiqueta="Mover hacia abajo (mm)"
            ayuda="Negativo: hacia arriba."
          />
        </div>
      </fieldset>

      <CampoSelector
        :model-value="formato.fecha.modo"
        etiqueta="Cómo se escribe la fecha"
        :opciones="MODOS"
        @update:model-value="cambiarModo"
      />

      <template v-for="grupo in GRUPOS" :key="grupo.grupo">
        <h3 class="pt-2 text-sm font-semibold text-tierra-700 dark:text-tierra-200">{{ grupo.titulo }}</h3>
        <EditorDeCampo
          v-for="entrada in entradas.filter((e) => e.grupo === grupo.grupo)"
          :key="entrada.clave"
          :entrada="entrada"
          :model-value="leerCampo(formato, entrada.clave)"
          @usar="ponerCampo(formato, entrada.clave, $event)"
        />
        <fieldset v-if="grupo.grupo === 'cheque'" class="rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700">
          <legend class="px-1 text-sm font-semibold">Monto en letras (segundo renglón)</legend>
          <CampoInterruptor
            :model-value="formato.montoEnLetras.segundaLinea !== null"
            etiqueta="Usar un segundo renglón"
            descripcion="Si el monto en letras no cabe en el primero, sigue en el segundo; lo que sobra se llena de asteriscos."
            @update:model-value="ponerSegundoRenglon(formato, $event)"
          />
          <div v-if="formato.montoEnLetras.segundaLinea" class="mt-2 grid grid-cols-3 gap-3">
            <CampoDeMedida v-model="formato.montoEnLetras.segundaLinea.xMm" etiqueta="Izquierda (mm)" />
            <CampoDeMedida v-model="formato.montoEnLetras.segundaLinea.yMm" etiqueta="Arriba (mm)" />
            <CampoDeMedida v-model="formato.montoEnLetras.segundaLinea.anchoMm" etiqueta="Ancho (mm)" />
          </div>
        </fieldset>
      </template>

      <fieldset class="rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700">
        <legend class="px-1 text-sm font-semibold">Comprobante de egreso</legend>
        <CampoInterruptor
          :model-value="formato.comprobante !== null"
          etiqueta="Va en la misma hoja, debajo del cheque"
          descripcion="Apagado, el comprobante sale en una hoja carta aparte."
          @update:model-value="ponerComprobante(formato, $event)"
        />
        <div v-if="formato.comprobante" class="mt-2 grid grid-cols-2 gap-3">
          <CampoDeMedida v-model="formato.comprobante.yMm" etiqueta="Desde arriba (mm)" />
          <CampoDeMedida v-model="formato.comprobante.altoMm" etiqueta="Alto (mm)" />
        </div>
      </fieldset>
    </template>
  </div>
</template>
