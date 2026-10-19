<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import {
  conRegimenDeIsr,
  conRegimenDeIva,
  conTipoDePersona,
  haceFaltaPreguntarLaContabilidad,
  type FiscalesDeEmpresa,
} from '../composables/datos-fiscales-de-empresa';
import {
  puedeSerAgenteDeIva,
  regimenesDeIsrPosibles,
  tieneRegimenDeIsr,
} from '../composables/propuesta-fiscal-de-empresa';
import { usarFiscalesDeEmpresa } from '../composables/usar-datos-fiscales';
import type {
  AgenteDeRetencionDeIva,
  RegimenDeIsrDeEmpresa,
  RegimenDeIva,
  TipoDePersona,
} from '../servicios/libro-de-compras.api';
import {
  AGENTES_DE_RETENCION_DE_IVA,
  AYUDA_DE_REGIMEN_DE_IVA,
  REGIMENES_DE_ISR_DE_EMPRESA,
  REGIMENES_DE_IVA,
  TEXTOS_FISCALES as T,
  TIPOS_DE_PERSONA,
} from '../textos';
import EstadoDeLaSeccionFiscal from './EstadoDeLaSeccionFiscal.vue';
import PreguntaDeContabilidad from './PreguntaDeContabilidad.vue';
import PreguntaDeVigencia from './PreguntaDeVigencia.vue';

/** Datos fiscales de la empresa para el libro de compras; se guardan con el formulario de Empresas. */
const props = defineProps<{ registroId: string | null; errores: Record<string, string> }>();
const modelo = defineModel<FiscalesDeEmpresa>();
const { cargando, fallo, reintentar, contexto } = usarFiscalesDeEmpresa(modelo, () => props.registroId);

const opcionesDePersona = opcionesDeLista(TIPOS_DE_PERSONA, false);
const opcionesDeIva = opcionesDeLista(REGIMENES_DE_IVA, false);
const opcionesDeAgente = opcionesDeLista(AGENTES_DE_RETENCION_DE_IVA, false);
const NO_APLICA = [{ valor: null, texto: 'No aplica' }];

const conIsr = computed(() => !!modelo.value && tieneRegimenDeIsr(modelo.value.regimenIva));
const opcionesDeIsr = computed(() =>
  conIsr.value
    ? regimenesDeIsrPosibles(modelo.value?.tipoDePersona ?? null).map((valor) => ({
        valor: valor as RegimenDeIsrDeEmpresa | null,
        texto: REGIMENES_DE_ISR_DE_EMPRESA[valor],
      }))
    : NO_APLICA,
);
const agenteEscogible = computed(() => !!modelo.value && puedeSerAgenteDeIva(modelo.value.regimenIva));
const preguntarContabilidad = computed(() => !!modelo.value && haceFaltaPreguntarLaContabilidad(modelo.value));

const cambiar = (cambio: Partial<FiscalesDeEmpresa>): void => {
  if (modelo.value) modelo.value = { ...modelo.value, ...cambio };
};
</script>

<template>
  <div v-if="modelo" class="space-y-4">
    <CampoSelector
      :model-value="modelo.tipoDePersona"
      etiqueta="Tipo de persona"
      :opciones="opcionesDePersona"
      requerido
      :error="errores.tipoDePersona"
      @update:model-value="modelo = conTipoDePersona(modelo, $event as TipoDePersona)"
    />
    <p class="-mt-2 text-xs text-tierra-500">{{ T.tipoDePersonaAyuda }}</p>
    <div class="space-y-1">
      <CampoSelector
        :model-value="modelo.regimenIva"
        etiqueta="Régimen de IVA"
        :opciones="opcionesDeIva"
        :error="errores.regimenIva"
        @update:model-value="modelo = conRegimenDeIva(modelo, $event as RegimenDeIva)"
      />
      <p class="text-xs text-tierra-500">{{ AYUDA_DE_REGIMEN_DE_IVA[modelo.regimenIva] }}</p>
    </div>
    <div class="space-y-1">
      <CampoSelector
        :model-value="modelo.regimenIsr"
        etiqueta="Régimen de ISR"
        :opciones="opcionesDeIsr"
        :deshabilitado="!conIsr"
        :error="errores.regimenIsr"
        @update:model-value="modelo = conRegimenDeIsr(modelo, $event as RegimenDeIsrDeEmpresa | null)"
      />
      <p v-if="!conIsr" class="text-xs text-tierra-500">{{ T.isrNoAplicaAyuda }}</p>
    </div>
    <div class="space-y-1">
      <CampoSelector
        :model-value="modelo.agenteDeRetencionIva"
        etiqueta="Agente de retención del IVA"
        :opciones="opcionesDeAgente"
        :deshabilitado="!agenteEscogible"
        :error="errores.agenteDeRetencionIva"
        @update:model-value="cambiar({ agenteDeRetencionIva: $event as AgenteDeRetencionDeIva })"
      />
      <p class="text-xs text-tierra-500">{{ agenteEscogible ? T.agenteIvaAyuda : T.agenteIvaNoAplicaAyuda }}</p>
    </div>
    <PreguntaDeContabilidad
      :model-value="modelo.esAgenteDeRetencionIsr"
      :hay-que-contestar="preguntarContabilidad"
      :error="errores.esAgenteDeRetencionIsr"
      @update:model-value="cambiar({ esAgenteDeRetencionIsr: $event })"
    />
    <PreguntaDeVigencia
      :model-value="modelo.vigenteDesde"
      :guardado="contexto.guardado"
      :hay-facturas-hoy="contexto.hayFacturasHoy"
      :error="errores.vigenteDesde"
      @update:model-value="cambiar({ vigenteDesde: $event })"
    />
  </div>
  <EstadoDeLaSeccionFiscal v-else :cargando="cargando" :fallo="fallo" @reintentar="reintentar" />
</template>
