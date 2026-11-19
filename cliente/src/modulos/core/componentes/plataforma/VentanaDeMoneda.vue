<script setup lang="ts">
import { computed } from 'vue';
import { Eye } from 'lucide-vue-next';
import {
  admiteCodigoDelBanguat,
  avisoDeCarga,
  ayudaDelCodigo,
  motivoSinCambiarActiva,
  opcionesDelBanguat,
  type FormularioDeMoneda,
} from '../../composables/plataforma/edicion-de-moneda';
import type { MensajeDeResultado } from '../../composables/plataforma/lista-de-monedas';
import type { MuestraDelBanguat, OpcionDelBanguat } from '../../servicios/monedas.api';
import BotonBase from '../BotonBase.vue';
import CampoInterruptor from '../CampoInterruptor.vue';
import CampoSelector from '../CampoSelector.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';
import ResultadoDeMuestra from './ResultadoDeMuestra.vue';

const props = defineProps<{
  lista: OpcionDelBanguat[];
  errores: Record<string, string>;
  enviando: boolean;
  muestra: MuestraDelBanguat | null;
  resultadoDeLaMuestra: MensajeDeResultado | null;
  cargandoMuestra: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; verMuestra: [] }>();
const edicion = defineModel<FormularioDeMoneda>({ required: true });

const moneda = computed(() => edicion.value.moneda);
const opciones = computed(() => (moneda.value ? opcionesDelBanguat(props.lista, moneda.value) : []));
const motivo = computed(() => (moneda.value ? motivoSinCambiarActiva(moneda.value) : null));
const conCodigo = computed(() => !!moneda.value && admiteCodigoDelBanguat(moneda.value));
const titulo = computed(() => (moneda.value ? `${moneda.value.nombre} (${moneda.value.codigo})` : 'Moneda'));
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form v-if="moneda" id="form-moneda" class="space-y-5" @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Símbolo {{ moneda.simbolo }} · {{ moneda.decimales }} decimales
      </p>
      <CampoInterruptor
        v-model="edicion.activa"
        etiqueta="Activa"
        :descripcion="motivo ?? 'Una moneda activa se ofrece en las operaciones nuevas de las empresas con el módulo.'"
        :deshabilitado="motivo !== null"
      />
      <section v-if="conCodigo" class="space-y-3">
        <CampoSelector
          v-model="edicion.codigoBanguat"
          etiqueta="Moneda del Banguat"
          :opciones="opciones"
          :error="errores.codigoBanguat"
        />
        <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ ayudaDelCodigo(edicion) }}</p>
        <BotonBase
          variante="secundario"
          pequeno
          :icono="Eye"
          :deshabilitado="edicion.codigoBanguat === null"
          :cargando="cargandoMuestra"
          @click="emit('verMuestra')"
        >
          Ver muestra
        </BotonBase>
        <ResultadoDeMuestra
          v-if="muestra && resultadoDeLaMuestra"
          :muestra="muestra"
          :resultado="resultadoDeLaMuestra"
        />
        <p v-if="avisoDeCarga(edicion)" class="text-sm text-tierra-700 dark:text-tierra-200">
          {{ avisoDeCarga(edicion) }}
        </p>
      </section>
      <fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend class="mb-2 text-sm font-semibold">Letras del monto</legend>
        <CampoTexto
          v-model="edicion.letrasSingular"
          etiqueta="Singular"
          placeholder="Ej. EURO"
          :longitud-maxima="60"
          :error="errores.letrasSingular"
        />
        <CampoTexto
          v-model="edicion.letrasPlural"
          etiqueta="Plural"
          placeholder="Ej. EUROS"
          :longitud-maxima="60"
          :error="errores.letrasPlural"
        />
      </fieldset>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-moneda" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
