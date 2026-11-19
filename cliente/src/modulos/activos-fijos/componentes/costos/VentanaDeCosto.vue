<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_CLASE_DE_COSTO_MANUAL, type EdicionDeCosto } from '../../composables/costos/edicion-de-costo';

/** Registrar a mano un costo que no pasa por el libro de compras: DUCA, planilla de obra, aporte, donación. */
defineProps<{ abierta: boolean; errores: Record<string, string>; enviando: boolean; esEdificio: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeCosto>({ required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Registrar un costo" @cerrar="emit('cerrar')">
    <form id="form-de-costo" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Para lo que no está en el libro de compras. Si el costo sí está en una factura del libro, capitalícelo desde
        «Por capitalizar» para no contarlo dos veces.
      </p>
      <CampoSelector
        v-model="edicion.claseDeCosto"
        etiqueta="Clase de costo"
        :opciones="opcionesDeLista(OPCIONES_DE_CLASE_DE_COSTO_MANUAL, false)"
        requerido
        :error="errores.claseDeCosto"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
        <CampoTexto
          v-model="edicion.monto"
          etiqueta="Monto"
          tipo="number"
          paso="0.01"
          requerido
          :error="errores.monto"
        />
      </div>
      <CampoTexto
        v-model="edicion.documentoDeSoporte"
        etiqueta="Documento de soporte"
        requerido
        :longitud-maxima="150"
        ayuda="Por ejemplo: «DUCA 26-0000123» o «Planilla de obra, quincena 1-15 mar»."
        :error="errores.documentoDeSoporte"
      />
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Descripción"
        :longitud-maxima="300"
        :error="errores.descripcion"
      />
      <CampoInterruptor
        v-model="edicion.aplicaAlLibroFiscal"
        etiqueta="Entra al libro fiscal"
        descripcion="Apáguelo si no hay documento que lo respalde ante la SAT (por ejemplo, el desmantelamiento)."
      />
      <CampoTexto
        v-if="!edicion.aplicaAlLibroFiscal"
        v-model="edicion.motivoFueraDelLibroFiscal"
        etiqueta="Por qué queda fuera del libro fiscal"
        multilinea
        requerido
        :longitud-maxima="300"
        :error="errores.motivoFueraDelLibroFiscal"
      />
      <CampoInterruptor
        v-if="esEdificio"
        v-model="edicion.noEsEdificacion"
        etiqueta="No es edificación ni requiere licencia"
        descripcion="Marque los costos que no son de construir el edificio."
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-costo" :cargando="enviando">Registrar costo</BotonBase>
    </template>
  </VentanaModal>
</template>
