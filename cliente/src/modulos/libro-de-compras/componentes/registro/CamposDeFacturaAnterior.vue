<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Info } from 'lucide-vue-next';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  diaAnterior,
  MOTIVOS_DE_FACTURA_ANTERIOR,
  opcionesDeTipoDeFacturaAnterior,
  type FacturaAnteriorEnEdicion,
} from '../../composables/documentos/edicion-de-factura-anterior';
import type { SugerenciasDeFacturasAnteriores } from '../../servicios/facturas-anteriores.api';
import { FACTURA_ANTERIOR as textos } from '../../textos-del-registro';
import SugerenciasDeFacturasAnterioresLista from './SugerenciasDeFacturasAnterioresLista.vue';

/** Los datos de la factura del sistema anterior que corrige una nota: vienen impresos en la propia nota. */
const props = defineProps<{ sugerencias: SugerenciasDeFacturasAnteriores; errores: Record<string, string> }>();
const factura = defineModel<FacturaAnteriorEnEdicion>({ required: true });

const tipos = opcionesDeTipoDeFacturaAnterior();
const motivos = [{ valor: null, texto: 'Elija el motivo' }, ...MOTIVOS_DE_FACTURA_ANTERIOR];
const ayudaDelMotivo = computed(
  () => MOTIVOS_DE_FACTURA_ANTERIOR.find(({ valor }) => valor === factura.value.motivoSinCredito)?.ayuda,
);
const esOtraCausa = computed(
  () => !factura.value.dioCredito && factura.value.motivoSinCredito === 'otra_causa_sin_credito',
);
const ultimaFecha = computed(() =>
  props.sugerencias.fechaDeInicio ? diaAnterior(props.sugerencias.fechaDeInicio) : undefined,
);
const error = (campo: string): string | undefined => props.errores[`facturaAnterior.${campo}`];
const conDebitos = computed(
  () =>
    !!factura.value.debitosAnterioresTotal ||
    !!factura.value.debitosAnterioresIva ||
    !!error('notasDeDebitoAnterioresTotal') ||
    !!error('notasDeDebitoAnterioresIva'),
);
/** Plegado por omisión; se abre solo si trae datos o error, y no se cierra mientras se escribe en él. */
const debitosAbiertos = ref(false);
watch(conDebitos, (hay) => hay && (debitosAbiertos.value = true), { immediate: true });
</script>

<template>
  <fieldset
    class="space-y-4 rounded-xl bg-tierra-50 p-3 ring-1 ring-tierra-200/70 sm:p-4 dark:bg-tierra-900/40 dark:ring-tierra-700"
  >
    <legend class="px-1 text-sm font-semibold">{{ textos.titulo }}</legend>
    <p class="flex gap-2 text-sm text-tierra-700 dark:text-tierra-200">
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ textos.cuandoUsarla }} {{ textos.datosImpresos }}</span>
    </p>
    <SugerenciasDeFacturasAnterioresLista v-model="factura" :sugerencias="sugerencias" />

    <div class="@container">
      <div class="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3">
        <CampoSelector
          v-model="factura.tipo"
          etiqueta="Tipo de factura"
          requerido
          :opciones="tipos"
          :error="error('tipo')"
        />
        <CampoTexto
          v-model="factura.serie"
          etiqueta="Serie"
          :longitud-maxima="40"
          :error="error('serie')"
          sin-correccion
        />
        <CampoTexto
          v-model="factura.numero"
          etiqueta="Número"
          requerido
          :longitud-maxima="40"
          :error="error('numero')"
          sin-correccion
        />
        <CampoTexto
          v-model="factura.fechaEmision"
          tipo="date"
          etiqueta="Fecha de emisión"
          requerido
          :maximo="ultimaFecha"
          :ayuda="textos.ayudaDeLaFecha"
          :error="error('fechaEmision')"
        />
        <CampoTexto
          v-model="factura.total"
          tipo="number"
          paso="any"
          etiqueta="Total de la factura (Q)"
          requerido
          :error="error('total')"
        />
        <CampoTexto
          v-model="factura.iva"
          tipo="number"
          paso="any"
          etiqueta="IVA de la factura (Q)"
          requerido
          :ayuda="textos.ayudaDelIva"
          :error="error('iva')"
        />
        <CampoTexto
          v-model="factura.autorizacionFel"
          etiqueta="Autorización FEL (si la tiene)"
          class="@md:col-span-2 @2xl:col-span-3"
          :error="error('autorizacionFel')"
          sin-correccion
        />
      </div>
    </div>

    <CampoInterruptor
      v-model="factura.dioCredito"
      etiqueta="¿Dio crédito fiscal?"
      :descripcion="factura.dioCredito ? textos.dioCredito : textos.noDioCredito"
    />
    <div v-if="!factura.dioCredito" class="space-y-3">
      <CampoSelector
        v-model="factura.motivoSinCredito"
        etiqueta="¿Por qué?"
        requerido
        :opciones="motivos"
        :error="error('motivoSinCredito')"
      />
      <p v-if="ayudaDelMotivo" class="flex gap-2 text-sm text-tierra-700 dark:text-tierra-200">
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ ayudaDelMotivo }}</span>
      </p>
      <CampoTexto
        v-if="esOtraCausa"
        v-model="factura.detalleDelMotivo"
        multilinea
        requerido
        etiqueta="Detalle de la causa"
        contar
        :longitud-maxima="500"
        :error="error('detalleDelMotivo')"
      />
    </div>

    <details
      :open="debitosAbiertos"
      class="rounded-xl ring-1 ring-tierra-200/70 dark:ring-tierra-700"
      @toggle="debitosAbiertos = ($event.target as HTMLDetailsElement).open"
    >
      <summary class="cursor-pointer px-3 py-2.5 text-sm font-medium marker:text-tierra-400">
        {{ textos.notasDeDebito }}
      </summary>
      <div class="space-y-3 px-3 pb-3">
        <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ textos.ayudaDeNotasDeDebito }}</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto
            v-model="factura.debitosAnterioresTotal"
            tipo="number"
            paso="any"
            etiqueta="Total de esas notas de débito (Q)"
            :error="error('notasDeDebitoAnterioresTotal')"
          />
          <CampoTexto
            v-model="factura.debitosAnterioresIva"
            tipo="number"
            paso="any"
            etiqueta="IVA de esas notas de débito (Q)"
            :error="error('notasDeDebitoAnterioresIva')"
          />
        </div>
      </div>
    </details>
  </fieldset>
</template>
