<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import {
  conCambioDeRegimen,
  retencionesPropuestas,
  retencionesSonLasPropuestas,
  type BaseFiscalDeProveedor,
  type FiscalesDeProveedor,
} from '../composables/datos-fiscales-de-proveedor';
import { usarFiscalesDeProveedor } from '../composables/usar-datos-fiscales';
import { REGIMENES_DE_ISR_DE_PROVEEDOR } from '../textos';
import EstadoDeLaSeccionFiscal from './EstadoDeLaSeccionFiscal.vue';

/** Datos fiscales del proveedor para el libro de compras (iguales para todas las empresas de la cuenta). */
const props = defineProps<{ registroId: string | null; errores: Record<string, string> }>();
const modelo = defineModel<FiscalesDeProveedor>();
const { cargando, fallo, reintentar } = usarFiscalesDeProveedor(modelo, () => props.registroId);

const opcionesDeIsr = opcionesDeLista(REGIMENES_DE_ISR_DE_PROVEEDOR, false);
const esPequeno = computed(() => modelo.value?.esPequenoContribuyente === true);
const ajustadoAMano = computed(() => !!modelo.value && !retencionesSonLasPropuestas(modelo.value));

/** Los errores de campos que no tienen selector propio (los «se le retiene» y el agente). */
const otrosErrores = computed(() => Object.entries(props.errores).filter(([campo]) => campo !== 'regimenIsr'));

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
  <div v-if="modelo" class="space-y-4">
    <CampoInterruptor
      :model-value="modelo.esPequenoContribuyente"
      etiqueta="Es pequeño contribuyente"
      descripcion="Factura con IVA del 5 % y no tiene régimen de ISR aparte."
      @update:model-value="cambiarRegimen({ esPequenoContribuyente: $event })"
    />
    <CampoSelector
      v-if="!esPequeno"
      :model-value="modelo.regimenIsr"
      etiqueta="Régimen de ISR"
      :opciones="opcionesDeIsr"
      :error="errores.regimenIsr"
      @update:model-value="cambiarRegimen({ regimenIsr: $event })"
    />
    <CampoInterruptor
      v-if="!esPequeno"
      :model-value="modelo.esAgenteDeRetencionIva"
      etiqueta="Es agente de retención del IVA"
      descripcion="Si lo es, normalmente no se le retiene el IVA."
      @update:model-value="cambiarRegimen({ esAgenteDeRetencionIva: $event })"
    />

    <fieldset class="space-y-4 rounded-lg border border-tierra-200 p-3 dark:border-tierra-700">
      <legend class="px-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">Retenciones al pagarle</legend>
      <CampoInterruptor
        v-if="esPequeno"
        :model-value="modelo.seLeRetieneIvaPequenoContribuyente"
        etiqueta="Se le retiene el IVA de pequeño contribuyente"
        @update:model-value="cambiar({ seLeRetieneIvaPequenoContribuyente: $event })"
      />
      <template v-else>
        <CampoInterruptor
          :model-value="modelo.seLeRetieneIva"
          etiqueta="Se le retiene el IVA"
          @update:model-value="cambiar({ seLeRetieneIva: $event })"
        />
        <CampoInterruptor
          :model-value="modelo.seLeRetieneIsr"
          etiqueta="Se le retiene el ISR"
          @update:model-value="cambiar({ seLeRetieneIsr: $event })"
        />
      </template>
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
