<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import {
  conCambioDeRegimen,
  REGIMENES_DEROGADOS,
  regimenesDeIsrPosibles,
  retencionesPropuestas,
  retencionesQueAplican,
  retencionesSonLasPropuestas,
  type BaseFiscalDeProveedor,
  type FiscalesDeProveedor,
} from '../composables/datos-fiscales-de-proveedor';
import { usarFiscalesDeProveedor } from '../composables/usar-datos-fiscales';
import type { RegimenDeIsrDeProveedor, RegimenDeIvaDeProveedor } from '../servicios/libro-de-compras.api';
import {
  AYUDA_DE_REGIMEN_DE_IVA_DE_PROVEEDOR as AYUDA_IVA,
  REGIMENES_DE_ISR_DE_PROVEEDOR,
  REGIMENES_DE_IVA_DE_PROVEEDOR,
  TEXTOS_FISCALES as T,
} from '../textos';
import EstadoDeLaSeccionFiscal from './EstadoDeLaSeccionFiscal.vue';

/** Datos fiscales del proveedor para el libro de compras (iguales para todas las empresas de la cuenta). */
const props = defineProps<{ registroId: string | null; errores: Record<string, string> }>();
const modelo = defineModel<FiscalesDeProveedor>();
const { cargando, fallo, reintentar } = usarFiscalesDeProveedor(modelo, () => props.registroId);

/** Los regímenes derogados solo se ofrecen si el proveedor ya lo tiene. */
const opcionesDeIva = computed(() =>
  (Object.entries(REGIMENES_DE_IVA_DE_PROVEEDOR) as [RegimenDeIvaDeProveedor, string][])
    .filter(([valor]) => !REGIMENES_DEROGADOS.includes(valor) || valor === modelo.value?.regimenIva)
    .map(([valor, texto]) => ({ valor, texto })),
);
const opcionesDeIsr = computed(() =>
  modelo.value
    ? regimenesDeIsrPosibles(modelo.value.regimenIva).map((valor) => ({
        valor,
        texto: valor ? REGIMENES_DE_ISR_DE_PROVEEDOR[valor] : 'No aplica',
      }))
    : [],
);
const esGeneral = computed(() => modelo.value?.regimenIva === 'general');
const esDerogado = computed(() => !!modelo.value && REGIMENES_DEROGADOS.includes(modelo.value.regimenIva));
const aplican = computed(() => (modelo.value ? retencionesQueAplican(modelo.value) : null));
const ayudaDelIsr = computed(() => {
  if (esGeneral.value) return '';
  return modelo.value?.regimenIva === 'no_domiciliado' ? T.isrDelNoDomiciliadoAyuda : T.isrDelProveedorNoAplicaAyuda;
});
const ajustadoAMano = computed(() => !!modelo.value && !retencionesSonLasPropuestas(modelo.value));

/** Los errores de campos que no tienen selector propio (los «se le retiene» y el agente). */
const otrosErrores = computed(() =>
  Object.entries(props.errores).filter(([campo]) => !['regimenIva', 'regimenIsr'].includes(campo)),
);

const cambiarRegimen = (cambio: Partial<BaseFiscalDeProveedor>): void => {
  if (modelo.value) modelo.value = conCambioDeRegimen(modelo.value, cambio);
};
const cambiar = (cambio: Partial<FiscalesDeProveedor>): void => {
  if (modelo.value) modelo.value = { ...modelo.value, ...cambio };
};
const restablecer = (): void => {
  if (modelo.value) modelo.value = { ...modelo.value, ...retencionesPropuestas(modelo.value) };
};
</script>

<template>
  <div v-if="modelo && aplican" class="space-y-4">
    <div class="space-y-1">
      <CampoSelector
        :model-value="modelo.regimenIva"
        etiqueta="Régimen de IVA"
        :opciones="opcionesDeIva"
        :error="errores.regimenIva"
        @update:model-value="cambiarRegimen({ regimenIva: $event })"
      />
      <p class="text-xs text-tierra-500">{{ AYUDA_IVA[modelo.regimenIva] }}</p>
      <p v-if="esDerogado" class="text-xs text-trigo-700 dark:text-trigo-300">{{ T.derogadoAvisoDelProveedor }}</p>
    </div>
    <div class="space-y-1">
      <CampoSelector
        :model-value="modelo.regimenIsr"
        etiqueta="Régimen de ISR"
        :opciones="opcionesDeIsr"
        :deshabilitado="!esGeneral"
        :error="errores.regimenIsr"
        @update:model-value="cambiarRegimen({ regimenIsr: $event as RegimenDeIsrDeProveedor | null })"
      />
      <p v-if="ayudaDelIsr" class="text-xs text-tierra-500">{{ ayudaDelIsr }}</p>
    </div>
    <CampoInterruptor
      v-if="esGeneral"
      :model-value="modelo.esAgenteDeRetencionIva"
      etiqueta="Es agente de retención del IVA"
      :descripcion="T.retieneIvaDeAgenteAyuda"
      @update:model-value="cambiarRegimen({ esAgenteDeRetencionIva: $event })"
    />

    <fieldset class="space-y-4 rounded-lg border border-tierra-200 p-3 dark:border-tierra-700">
      <legend class="px-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">Retenciones al pagarle</legend>
      <CampoInterruptor
        v-if="aplican.ivaPequenoContribuyente"
        :model-value="modelo.seLeRetieneIvaPequenoContribuyente"
        etiqueta="Se le retiene el IVA de pequeño contribuyente"
        @update:model-value="cambiar({ seLeRetieneIvaPequenoContribuyente: $event })"
      />
      <CampoInterruptor
        :model-value="modelo.seLeRetieneIva"
        etiqueta="Se le retiene el IVA"
        :descripcion="aplican.iva ? undefined : T.retieneIvaNoAplicaAyuda"
        :deshabilitado="!aplican.iva"
        @update:model-value="cambiar({ seLeRetieneIva: $event })"
      />
      <CampoInterruptor
        :model-value="modelo.seLeRetieneIsr"
        etiqueta="Se le retiene el ISR"
        :descripcion="aplican.isr ? T.seLeRetieneIsrAyuda : T.retieneIsrNoAplicaAyuda"
        :deshabilitado="!aplican.isr"
        @update:model-value="cambiar({ seLeRetieneIsr: $event })"
      />
      <p class="text-xs text-tierra-500">
        Se proponen según el régimen. Cámbielas si el proveedor está exento (por resolución de la SAT, cooperativa u
        otro caso).
      </p>
      <div v-if="ajustadoAMano" class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-trigo-700 dark:text-trigo-300">Ajustadas a mano: no siguen lo que propone el régimen.</p>
        <BotonBase variante="secundario" @click="restablecer">Usar lo que propone el régimen</BotonBase>
      </div>
    </fieldset>
    <ul v-if="otrosErrores.length" class="space-y-1 text-sm text-red-600 dark:text-red-400" role="alert">
      <li v-for="[campo, mensaje] in otrosErrores" :key="campo">{{ mensaje }}</li>
    </ul>
  </div>
  <EstadoDeLaSeccionFiscal v-else :cargando="cargando" :fallo="fallo" @reintentar="reintentar" />
</template>
