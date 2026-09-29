<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { conRegimenDeIva, type FiscalesDeEmpresa } from '../composables/datos-fiscales-de-empresa';
import { usarFiscalesDeEmpresa } from '../composables/usar-datos-fiscales';
import type { AgenteDeRetencionDeIva, RegimenDeIsrDeEmpresa, RegimenDeIva } from '../servicios/libro-de-compras.api';
import { AGENTES_DE_RETENCION_DE_IVA, REGIMENES_DE_ISR_DE_EMPRESA, REGIMENES_DE_IVA } from '../textos';
import EstadoDeLaSeccionFiscal from './EstadoDeLaSeccionFiscal.vue';

/** Datos fiscales de la empresa para el libro de compras; se guardan con el formulario de Empresas. */
const props = defineProps<{ registroId: string | null; errores: Record<string, string> }>();
const modelo = defineModel<FiscalesDeEmpresa>();
const { cargando, fallo, reintentar } = usarFiscalesDeEmpresa(modelo, () => props.registroId);

const opcionesDeIva = opcionesDeLista(REGIMENES_DE_IVA, false);
const opcionesDeIsr = opcionesDeLista(REGIMENES_DE_ISR_DE_EMPRESA, false);
const opcionesDeAgente = opcionesDeLista(AGENTES_DE_RETENCION_DE_IVA, false);
const esPequeno = computed(() => modelo.value?.regimenIva === 'pequeno_contribuyente');

const cambiar = (cambio: Partial<FiscalesDeEmpresa>): void => {
  if (modelo.value) modelo.value = { ...modelo.value, ...cambio };
};
</script>

<template>
  <div v-if="modelo" class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoSelector
        :model-value="modelo.regimenIva"
        etiqueta="Régimen de IVA"
        :opciones="opcionesDeIva"
        :error="errores.regimenIva"
        @update:model-value="modelo = conRegimenDeIva(modelo, $event as RegimenDeIva)"
      />
      <CampoSelector
        :model-value="modelo.regimenIsr"
        etiqueta="Régimen de ISR"
        :opciones="opcionesDeIsr"
        :error="errores.regimenIsr"
        @update:model-value="cambiar({ regimenIsr: $event as RegimenDeIsrDeEmpresa })"
      />
    </div>
    <CampoSelector
      :model-value="modelo.agenteDeRetencionIva"
      etiqueta="Agente de retención del IVA"
      :opciones="opcionesDeAgente"
      :deshabilitado="esPequeno"
      :error="errores.agenteDeRetencionIva"
      @update:model-value="cambiar({ agenteDeRetencionIva: $event as AgenteDeRetencionDeIva })"
    />
    <p v-if="esPequeno" class="text-xs text-tierra-500">Un pequeño contribuyente no es agente de retención del IVA.</p>
    <CampoInterruptor
      :model-value="modelo.esAgenteDeRetencionIsr"
      etiqueta="Es agente de retención del ISR"
      descripcion="Actívelo si la empresa debe retener ISR a sus proveedores."
      @update:model-value="cambiar({ esAgenteDeRetencionIsr: $event })"
    />
    <p v-if="errores.esAgenteDeRetencionIsr" class="text-sm text-red-600" role="alert">
      {{ errores.esAgenteDeRetencionIsr }}
    </p>
  </div>
  <EstadoDeLaSeccionFiscal v-else :cargando="cargando" :fallo="fallo" @reintentar="reintentar" />
</template>
