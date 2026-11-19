<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeDisminucion } from '../composables/fondos/edicion-de-fondo';
import { opcionesDeCuentas } from '../composables/fondos/opciones-de-fondos';
import type { CuentaParaElFondo } from '../servicios/catalogos.api';
import { AYUDA_DE_LA_FECHA } from '../textos';

/** Disminuir el monto del fondo: el custodio devuelve dinero al banco con un depósito. */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  errores: Record<string, string>;
  cuentas: readonly CuentaParaElFondo[];
  fondo: { nombre: string; monto: string };
}>();
const edicion = defineModel<EdicionDeDisminucion>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opciones = computed(() => opcionesDeCuentas(props.cuentas, 'La cuenta del fondo'));
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Disminuir el fondo" @cerrar="emit('cerrar')">
    <form id="form-de-disminucion" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        «{{ fondo.nombre }}» tiene un monto de <strong>{{ formatearMonto(fondo.monto) }}</strong
        >. El custodio deposita en el banco lo que escriba aquí y el monto del fondo baja en esa cantidad.
      </p>
      <CampoSelector
        v-model="edicion.cuentaBancariaId"
        etiqueta="Cuenta donde se deposita"
        :opciones="opciones"
        :error="errores.cuentaBancariaId"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.monto"
          etiqueta="Monto"
          tipo="number"
          paso="any"
          requerido
          :error="errores.monto"
        />
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha"
          tipo="date"
          :ayuda="AYUDA_DE_LA_FECHA"
          :error="errores.fecha"
        />
      </div>
      <CampoTexto
        v-model="edicion.referencia"
        etiqueta="Referencia del depósito"
        :longitud-maxima="100"
        :error="errores.referencia"
      />
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :longitud-maxima="500" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-disminucion" :cargando="enviando">Disminuir</BotonBase>
    </template>
  </VentanaModal>
</template>
