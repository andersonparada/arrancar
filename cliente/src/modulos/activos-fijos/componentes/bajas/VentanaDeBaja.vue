<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { CAUSAS_DE_BAJA, type EdicionDeBaja } from '../../composables/bajas/edicion-de-baja';
import CamposDeVenta from './CamposDeVenta.vue';

/** Dar de baja o vender un activo: causa, quién autoriza y, si se vende, los datos de la venta. */
defineProps<{
  abierta: boolean;
  errores: Record<string, string>;
  enviando: boolean;
  puedeEscribirElCosto: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeBaja>({ required: true });
const causas = opcionesDeLista(CAUSAS_DE_BAJA, false).sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Dar de baja o vender" @cerrar="emit('cerrar')">
    <form id="form-de-baja" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
        <CampoSelector v-model="edicion.causa" etiqueta="Causa" requerido :opciones="causas" :error="errores.causa" />
      </div>
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Qué pasó con el bien"
        multilinea
        requerido
        :longitud-maxima="500"
        contar
        :error="errores.descripcion"
      />
      <CampoTexto
        v-model="edicion.autorizadaPor"
        etiqueta="Quién autoriza"
        requerido
        :longitud-maxima="150"
        ayuda="Firma el acta."
        :error="errores.autorizadaPor"
      />
      <CamposDeVenta
        v-if="edicion.causa === 'venta'"
        v-model="edicion"
        :errores="errores"
        :puede-escribir-el-costo="puedeEscribirElCosto"
      />
      <CampoTexto
        v-else
        v-model="edicion.destinoDelBien"
        etiqueta="Destino del bien"
        :longitud-maxima="300"
        ayuda="Dónde quedó o a quién se entregó, si aplica."
      />
      <CampoTexto
        v-if="edicion.causa === 'robo' || edicion.causa === 'extravio'"
        v-model="edicion.numeroDeDenuncia"
        etiqueta="Número de denuncia"
        :longitud-maxima="60"
        :error="errores.numeroDeDenuncia"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-baja" variante="peligro" :cargando="enviando">Dar de baja</BotonBase>
    </template>
  </VentanaModal>
</template>
