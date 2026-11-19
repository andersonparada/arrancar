<script setup lang="ts">
import { computed } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import {
  OPCIONES_DE_CLASE_DE_COSTO,
  OPCIONES_DE_DESTINO,
  type EdicionDeAsignacion,
} from '../../composables/bandeja/edicion-de-capitalizacion';
import { esNotaDelLibro } from '../../composables/bandeja/lineas-de-bandeja';
import { incisoDeLaParte } from '../../composables/bandeja/solicitud-de-capitalizacion';
import { erroresDeLaParte } from '../../composables/bandeja/validar-capitalizacion';
import type { usarCatalogosDeCapitalizacion } from '../../composables/bandeja/usar-catalogos-de-capitalizacion';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import CamposDeActivoNuevo from './CamposDeActivoNuevo.vue';
import UbicacionYDetalleDelNuevo from './UbicacionYDetalleDelNuevo.vue';

/**
 * Una parte de una línea: cuánto de su costo y adónde va (un activo nuevo, uno que ya existe o una compra
 * conjunta). El monto se escribe sin signo; en una nota de crédito el sistema lo resta solo.
 */
const props = defineProps<{
  linea: LineaDeBandeja;
  errores: Record<string, string>;
  catalogos: ReturnType<typeof usarCatalogosDeCapitalizacion>;
  numero: number;
  puedeQuitar: boolean;
}>();
const emit = defineEmits<{ quitar: [] }>();
const parte = defineModel<EdicionDeAsignacion>({ required: true });

const propios = computed(() => erroresDeLaParte(props.errores, parte.value.clave));
const inciso = computed(() =>
  incisoDeLaParte(parte.value, { lineas: [], clases: props.catalogos.clases, activos: props.catalogos.activos }),
);
const conClaseDeCosto = computed(() => parte.value.destino !== 'nuevo' && !esNotaDelLibro(props.linea));
const departamentos = computed(() => props.catalogos.departamentosDe(parte.value.nuevo.localidadId));
</script>

<template>
  <fieldset
    class="space-y-4 rounded-xl bg-tierra-50 p-3 ring-1 ring-tierra-200 sm:p-4 dark:bg-tierra-800/40 dark:ring-tierra-700"
  >
    <legend class="px-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">Parte {{ numero }}</legend>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="parte.monto"
        etiqueta="Monto de esta parte"
        tipo="number"
        paso="0.01"
        requerido
        :error="propios.monto"
      />
      <CampoSelector
        v-model="parte.destino"
        etiqueta="¿Adónde va?"
        :opciones="opcionesDeLista(OPCIONES_DE_DESTINO, false)"
        requerido
      />
    </div>

    <CampoSelector
      v-if="parte.destino === 'existente'"
      v-model="parte.activoId"
      etiqueta="Activo que recibe el costo"
      :opciones="catalogos.opciones.activoId"
      requerido
      :error="propios.activoId"
    />
    <template v-else-if="parte.destino === 'conjunta'">
      <CampoSelector
        v-model="parte.altaConjuntaId"
        etiqueta="Compra conjunta"
        :opciones="catalogos.opciones.altaConjuntaId"
        requerido
        :error="propios.altaConjuntaId"
      />
      <p class="text-xs text-tierra-600 dark:text-tierra-300">
        El monto se reparte en partes iguales entre los activos vigentes de esa compra; el sobrante del redondeo va al
        último.
      </p>
    </template>
    <CampoSelector
      v-if="conClaseDeCosto"
      v-model="parte.claseDeCosto"
      etiqueta="Clase de costo"
      :opciones="opcionesDeLista(OPCIONES_DE_CLASE_DE_COSTO, false)"
    />

    <template v-if="parte.destino === 'nuevo'">
      <CamposDeActivoNuevo
        v-model="parte.nuevo"
        v-model:no-es-edificacion="parte.noEsEdificacion"
        :errores="propios"
        :clases="catalogos.opciones.claseId"
        :inciso="inciso ?? null"
        :monto="parte.monto"
      />
      <details class="rounded-lg ring-1 ring-tierra-200 dark:ring-tierra-700">
        <summary class="cursor-pointer px-3 py-2 text-sm font-medium">
          Ubicación, marca y códigos de cada unidad (opcional)
        </summary>
        <div class="p-3">
          <UbicacionYDetalleDelNuevo
            v-model="parte.nuevo"
            :errores="propios"
            :localidades="catalogos.opciones.localidadId"
            :departamentos="departamentos"
          />
        </div>
      </details>
    </template>

    <div v-if="puedeQuitar" class="flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="Trash2" @click="emit('quitar')">Quitar esta parte</BotonBase>
    </div>
  </fieldset>
</template>
