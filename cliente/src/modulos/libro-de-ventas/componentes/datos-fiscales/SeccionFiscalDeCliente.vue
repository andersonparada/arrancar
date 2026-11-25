<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import {
  conCambioFiscal,
  explicacionDeLoQueRetiene,
  opcionesDeAgente,
  opcionesQueAplican,
  type FiscalesDeCliente,
} from '../../composables/datos-fiscales/datos-fiscales-de-cliente';
import { usarFiscalesDeCliente } from '../../composables/datos-fiscales/usar-datos-fiscales-de-cliente';
import { TEXTOS_FISCALES_DE_CLIENTE as T } from '../../textos-fiscales-de-cliente';
import EstadoDeLaSeccionFiscal from './EstadoDeLaSeccionFiscal.vue';

/** Datos fiscales del cliente para vender: si retiene IVA o ISR (iguales para todas las empresas de la cuenta). */
const props = defineProps<{ registroId: string | null; errores: Record<string, string> }>();
const modelo = defineModel<FiscalesDeCliente>();
const { cargando, fallo, reintentar } = usarFiscalesDeCliente(modelo, () => props.registroId);

const opciones = opcionesDeAgente();
const aplican = computed(() => (modelo.value ? opcionesQueAplican(modelo.value) : null));
const propuestas = computed(() => (modelo.value ? explicacionDeLoQueRetiene(modelo.value) : []));
const cambiar = (cambio: Partial<FiscalesDeCliente>): void => {
  if (modelo.value) modelo.value = conCambioFiscal(modelo.value, cambio);
};
</script>

<template>
  <div v-if="modelo && aplican" class="space-y-4">
    <div class="space-y-1">
      <CampoSelector
        :model-value="modelo.agenteDeRetencionIva"
        etiqueta="Agente de retención del IVA"
        :opciones="opciones"
        :error="errores.agenteDeRetencionIva"
        @update:model-value="cambiar({ agenteDeRetencionIva: $event })"
      />
      <p class="text-xs text-tierra-500">{{ T.agenteAyuda }}</p>
    </div>
    <CampoInterruptor
      :model-value="modelo.exportaProductosAgropecuarios"
      etiqueta="Exporta productos agropecuarios"
      :descripcion="aplican.exportaProductosAgropecuarios ? T.exportaAyuda : T.exportaNoAplicaAyuda"
      :deshabilitado="!aplican.exportaProductosAgropecuarios"
      @update:model-value="cambiar({ exportaProductosAgropecuarios: $event })"
    />
    <p v-if="errores.exportaProductosAgropecuarios" class="text-sm text-red-600 dark:text-red-400" role="alert">
      {{ errores.exportaProductosAgropecuarios }}
    </p>
    <CampoInterruptor
      :model-value="modelo.retieneIvaAPequenoContribuyente"
      etiqueta="Retiene el IVA a pequeños contribuyentes"
      :descripcion="
        aplican.retieneIvaAPequenoContribuyente
          ? T.retieneIvaAPequenoContribuyenteAyuda
          : T.retieneIvaAPequenoContribuyenteNoAplicaAyuda
      "
      :deshabilitado="!aplican.retieneIvaAPequenoContribuyente"
      @update:model-value="cambiar({ retieneIvaAPequenoContribuyente: $event })"
    />
    <p v-if="errores.retieneIvaAPequenoContribuyente" class="text-sm text-red-600 dark:text-red-400" role="alert">
      {{ errores.retieneIvaAPequenoContribuyente }}
    </p>
    <CampoInterruptor
      :model-value="modelo.retieneIsr"
      etiqueta="Retiene ISR"
      :descripcion="T.retieneIsrAyuda"
      @update:model-value="cambiar({ retieneIsr: $event })"
    />
    <div class="rounded-lg bg-tierra-50 p-3 text-xs text-tierra-600 dark:bg-tierra-800 dark:text-tierra-300">
      <template v-if="propuestas.length">
        <p class="font-medium">{{ T.propone }}</p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="propuesta in propuestas" :key="propuesta">{{ propuesta }}</li>
        </ul>
        <p class="mt-1">{{ T.ajustable }}</p>
      </template>
      <p v-else>{{ T.nada }}</p>
    </div>
  </div>
  <EstadoDeLaSeccionFiscal v-else :cargando="cargando" :fallo="fallo" @reintentar="reintentar" />
</template>
