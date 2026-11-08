<script setup lang="ts">
import { computed } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeLaFila, type ResumenDeLaSeleccion } from '../../composables/bandeja/datos-de-la-bandeja';
import { fraseDelResumen, resumenDeLoRegistrable } from '../../composables/bandeja/resumen-de-la-confirmacion';
import type {
  FilaConError,
  FilaRegistrada,
  ProveedorConPreguntas,
} from '../../composables/bandeja/datos-de-la-confirmacion';
import type { RespuestasFiscales } from '../../composables/documentos/preguntas-fiscales';
import type { DteRecibido, ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';
import PreguntasDeDatosFiscales from '../registro/PreguntasDeDatosFiscales.vue';
import type { EdicionDeProveedorNuevo } from '../../composables/bandeja/datos-de-proveedores-nuevos';
import FilasDeLaVistaPrevia from './FilasDeLaVistaPrevia.vue';
import ProveedoresNuevosDelDte from './ProveedoresNuevosDelDte.vue';
import ResultadosDeLaConfirmacion from './ResultadosDeLaConfirmacion.vue';

/**
 * Confirmar lo marcado en dos tiempos: primero una vista previa con lo que se registraría, lo que se creará (proveedores
 * nuevos) y lo que hay que corregir; después, el resultado fila por fila. Solo se confirma lo que la vista previa aceptó.
 */
const props = defineProps<{
  abierta: boolean;
  filas: DteRecibido[];
  resumen: ResumenDeLaSeleccion;
  calculando: boolean;
  enviando: boolean;
  listas: ResultadoDeVistaPrevia[];
  conError: FilaConError[];
  proveedores: ProveedorConPreguntas[];
  faltaContestar: boolean;
  proveedoresNuevos: EdicionDeProveedorNuevo[];
  intentosConProblemas: number;
  resultado: { registradas: FilaRegistrada[]; conError: FilaConError[] } | null;
}>();
const respuestas = defineModel<Record<string, RespuestasFiscales>>({ required: true });
const emit = defineEmits<{ cerrar: []; confirmar: []; recalcular: [] }>();

const titulos = computed(() => new Map(props.filas.map((fila) => [fila.id, tituloDeLaFila(fila)])));
const tipos = computed(() => new Map(props.filas.map((fila) => [fila.id, fila.tipoDte])));
const registrable = computed(() => resumenDeLoRegistrable(props.listas, tipos.value, props.resumen.cantidad));
const frase = computed(() => fraseDelResumen(registrable.value));
const contestar = (nit: string, valor: RespuestasFiscales): void => {
  respuestas.value = { ...respuestas.value, [nit]: valor };
};
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Confirmar los DTE marcados" ancha @cerrar="emit('cerrar')">
    <ResultadosDeLaConfirmacion
      v-if="resultado"
      :titulos="titulos"
      :registradas="resultado.registradas"
      :con-error="resultado.conError"
    />
    <div v-else class="space-y-4">
      <p v-if="calculando" class="text-sm text-tierra-500" role="status">Calculando lo que se registraría…</p>
      <p v-else-if="!frase.hayQueRegistrar" class="text-sm font-medium">{{ frase.texto }}</p>
      <p v-else class="text-sm">
        Se registrarán <strong>{{ frase.texto }}</strong>
        <template v-if="frase.desglose"> ({{ frase.desglose }})</template> por
        {{ formatearMonto(registrable.total) }} en total, cada uno con su cálculo de IVA y retenciones.
      </p>
      <ProveedoresNuevosDelDte :proveedores="proveedoresNuevos" :intentos="intentosConProblemas" />
      <p
        v-if="resumen.anuladasEnLaSat"
        class="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span> {{ resumen.anuladasEnLaSat }} anuladas en la SAT no se pueden registrar: descártelas. </span>
      </p>
      <FilasDeLaVistaPrevia
        v-if="!calculando"
        :titulos="titulos"
        :tipos="tipos"
        :listas="listas"
        :con-error="conError"
      />
      <section
        v-if="proveedores.length"
        class="space-y-4 rounded-lg border border-tierra-200 p-3 dark:border-tierra-700"
      >
        <h3 class="font-semibold">Falta saber del proveedor</h3>
        <div v-for="proveedor in proveedores" :key="proveedor.nit" class="space-y-2">
          <p class="text-sm font-medium">{{ proveedor.nombre }} (NIT {{ proveedor.nit }})</p>
          <PreguntasDeDatosFiscales
            :model-value="respuestas[proveedor.nit] ?? {}"
            :preguntas="proveedor.preguntas"
            @update:model-value="contestar(proveedor.nit, $event)"
          />
        </div>
        <BotonBase
          variante="secundario"
          :deshabilitado="faltaContestar"
          :cargando="calculando"
          @click="emit('recalcular')"
        >
          Volver a calcular
        </BotonBase>
      </section>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">{{ resultado ? 'Cerrar' : 'Cancelar' }}</BotonBase>
      <BotonBase
        v-if="!resultado"
        :deshabilitado="calculando || listas.length === 0"
        :cargando="enviando"
        @click="emit('confirmar')"
      >
        Registrar {{ listas.length }} {{ listas.length === 1 ? 'documento' : 'documentos' }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
