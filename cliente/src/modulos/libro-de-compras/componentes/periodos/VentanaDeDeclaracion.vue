<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import {
  opcionesDeFormulario,
  sinCreditoFiscal,
  type DeclaracionEnEdicion,
} from '../../composables/periodos/datos-de-periodos';
import type { FormularioDeDeclaracion } from '../../servicios/periodos.api';
import { VENTANA_DE_DECLARACION as textos } from '../../textos-de-periodos';

/**
 * Declarar un período (o rectificarlo): el formulario, el número y la fecha son opcionales. El resumen dice qué va a
 * pasar antes de confirmar.
 */
const props = defineProps<{
  abierta: boolean;
  rectificacion: boolean;
  resumen: string[];
  enviando: boolean;
  errores: Record<string, string>;
  /** El formulario de la última declaración, para saber si el crédito fiscal aplica cuando se deja el automático. */
  formularioVigente?: FormularioDeDeclaracion | null;
}>();
const edicion = defineModel<DeclaracionEnEdicion>({ required: true });
defineEmits<{ guardar: []; cerrar: [] }>();
const formularios = opcionesDeFormulario();
const pideCredito = computed(() => !sinCreditoFiscal(edicion.value.formulario || props.formularioVigente || null));
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="rectificacion ? textos.tituloRectificacion : textos.titulo"
    @cerrar="$emit('cerrar')"
  >
    <form id="declarar-periodo" class="flex flex-col gap-4" novalidate @submit.prevent="$emit('guardar')">
      <ul class="list-disc space-y-1 rounded-lg bg-tierra-100 p-3 pl-7 text-sm dark:bg-tierra-800">
        <li v-for="linea in resumen" :key="linea">{{ linea }}</li>
      </ul>
      <p v-if="errores.periodo" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ errores.periodo }}</p>
      <CampoSelector
        v-model="edicion.formulario"
        :etiqueta="textos.formulario"
        :opciones="formularios"
        :error="errores.formulario"
      />
      <CampoTexto
        v-model="edicion.numero"
        :etiqueta="textos.numero"
        :ayuda="textos.numeroAyuda"
        :error="errores.numeroDeFormulario"
        :longitud-maxima="40"
        sin-correccion
      />
      <CampoTexto
        v-model="edicion.fecha"
        tipo="date"
        :etiqueta="textos.fecha"
        :ayuda="textos.fechaAyuda"
        :error="errores.fechaDePresentacion"
      />
      <CampoTexto
        v-model="edicion.remanenteAnterior"
        :etiqueta="textos.remanente"
        :ayuda="textos.remanenteAyuda"
        :error="errores.remanenteDeRetencionesAnterior"
        tipo="number"
        paso="0.01"
      />
      <CampoTexto
        v-if="pideCredito"
        v-model="edicion.creditoAnterior"
        :etiqueta="textos.credito"
        :ayuda="textos.creditoAyuda"
        :error="errores.remanenteDeCreditoAnterior"
        tipo="number"
        paso="0.01"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="declarar-periodo" :cargando="enviando">
        {{ rectificacion ? textos.botonRectificacion : textos.boton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
