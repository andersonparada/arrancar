<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { marcaDeDiasVacios } from '../composables/condiciones-de-pago';
import { usarCondicionesDePago } from '../composables/usar-condiciones-de-pago';
import type { CondicionesDeProveedor } from '../servicios/tipos';
import { AYUDA_DE_CONTAR_DESDE_LA_RECEPCION, AYUDA_DE_DIAS_DE_CREDITO, AYUDA_DEL_PLAZO_NUEVO } from '../textos';
import EstadoDeLaSeccion from './EstadoDeLaSeccion.vue';

/** Los días de crédito del proveedor, iguales para todas las empresas de la cuenta; se guardan con su formulario. */
const props = defineProps<{ registroId: string | null; errores: Record<string, string> }>();
const modelo = defineModel<CondicionesDeProveedor>();
const { cargando, fallo, reintentar, dias, mesesPorOmision } = usarCondicionesDePago(modelo, () => props.registroId);
</script>

<template>
  <div v-if="modelo" class="space-y-4">
    <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DEL_PLAZO_NUEVO }}</p>
    <CampoTexto
      v-model="dias"
      etiqueta="Días de crédito"
      tipo="number"
      :placeholder="marcaDeDiasVacios(mesesPorOmision)"
      :ayuda="AYUDA_DE_DIAS_DE_CREDITO"
      :error="errores.diasDeCredito"
    />
    <CampoInterruptor
      :model-value="modelo.contarDesdeLaRecepcion"
      etiqueta="Contar el plazo desde la recepción"
      :descripcion="AYUDA_DE_CONTAR_DESDE_LA_RECEPCION"
      @update:model-value="modelo = { ...modelo, contarDesdeLaRecepcion: $event }"
    />
    <p v-if="errores.contarDesdeLaRecepcion" class="text-sm text-red-700 dark:text-red-400" role="alert">
      {{ errores.contarDesdeLaRecepcion }}
    </p>
  </div>
  <EstadoDeLaSeccion v-else :cargando="cargando" :fallo="fallo" @reintentar="reintentar" />
</template>
