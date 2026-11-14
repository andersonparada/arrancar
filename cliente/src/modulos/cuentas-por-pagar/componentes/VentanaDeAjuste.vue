<script setup lang="ts">
import { computed } from 'vue';
import { Info, TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import {
  ayudaDeLaCausa,
  esDeAnioAnterior,
  MAXIMO_DE_LA_REFERENCIA_DEL_AJUSTE,
  opcionesDeCausaDeAjuste,
  type EdicionDeAjuste,
} from '../composables/ajuste-de-saldo';
import { fechaDeHoy } from '../composables/dinero';
import {
  AVISO_DE_AÑO_ANTERIOR,
  AVISO_DE_ERROR_DE_LA_NOTA,
  AVISO_DEL_AJUSTE,
  AYUDAS_DE_LAS_CAUSAS_DEL_AJUSTE,
  MAXIMO_DEL_MOTIVO,
} from '../textos';

/** Ajustar el saldo a favor de una nota; `resumen` dice qué va a pasar y `tope` es el de «Diferencia menor». */
const props = defineProps<{ resumen: string; tope: string; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeAjuste>({ required: true });
const causas = opcionesDeCausaDeAjuste();
const ayudaDeLaCausaEscogida = computed(() =>
  ayudaDeLaCausa(edicion.value.causa, props.tope, AYUDAS_DE_LAS_CAUSAS_DEL_AJUSTE),
);
const deAnioAnterior = computed(() => esDeAnioAnterior(edicion.value.fecha, fechaDeHoy()));
const referenciaObligatoria = computed(() => edicion.value.causa === 'compensado_con_otra_cuenta');
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Ajustar el saldo a favor" @cerrar="emit('cerrar')">
    <form id="form-ajuste" class="space-y-4" @submit.prevent="emit('guardar')">
      <p
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AVISO_DE_ERROR_DE_LA_NOTA }}</span>
      </p>
      <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="0.01" requerido :error="errores.monto" />
      <CampoTexto v-model="edicion.fecha" etiqueta="Fecha del ajuste" tipo="date" requerido :error="errores.fecha" />
      <p v-if="deAnioAnterior" class="flex gap-2 text-sm text-tierra-800 dark:text-trigo-300" role="note">
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AVISO_DE_AÑO_ANTERIOR }}</span>
      </p>
      <CampoSelector v-model="edicion.causa" etiqueta="Causa" requerido :opciones="causas" :error="errores.causa" />
      <p v-if="ayudaDeLaCausaEscogida" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ ayudaDeLaCausaEscogida }}
      </p>
      <CampoTexto
        v-model="edicion.referencia"
        etiqueta="Referencia"
        :requerido="referenciaObligatoria"
        :longitud-maxima="MAXIMO_DE_LA_REFERENCIA_DEL_AJUSTE"
        :ayuda="referenciaObligatoria ? 'Obligatoria: con qué se compensó.' : 'Opcional.'"
        :error="errores.referencia"
      />
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Qué pasó, en pocas palabras."
        :error="errores.motivo"
      />
      <p class="text-sm">{{ resumen }}</p>
      <p class="text-xs text-tierra-500">{{ AVISO_DEL_AJUSTE }}</p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-ajuste" variante="peligro" :cargando="enviando">Ajustar saldo</BotonBase>
    </template>
  </VentanaModal>
</template>
