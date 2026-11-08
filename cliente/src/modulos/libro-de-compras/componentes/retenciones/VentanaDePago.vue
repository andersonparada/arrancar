<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { PagoEnEdicion } from '../../composables/retenciones/datos-de-pagos';
import { fechaDeHoy, nombreDelMes, tieneAccesorios } from '../../composables/retenciones/datos-de-pagos';
import type { GrupoDelMes } from '../../servicios/retenciones.api';
import { VENTANA_DE_ENTEROS as textos } from '../../textos-de-retenciones';
import CifrasDelGrupo from './CifrasDelGrupo.vue';

/**
 * Registra un pago de las retenciones de un mes y grupo, o corrige uno. Muestra lo retenido y lo ya pagado, y cómo
 * quedaría lo que falta con el monto escrito.
 */
defineProps<{
  abierta: boolean;
  grupo: GrupoDelMes | null;
  corrigiendo: boolean;
  faltante: string | null;
  /** Impuesto más multa, intereses y mora, calculado con lo escrito. */
  total: string;
  enviando: boolean;
  errores: Record<string, string>;
  encima?: boolean;
}>();
const pago = defineModel<PagoEnEdicion>({ required: true });
defineEmits<{ guardar: []; cerrar: [] }>();
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="corrigiendo ? 'Corregir el pago' : textos.registrar"
    :encima="encima"
    @cerrar="$emit('cerrar')"
  >
    <form v-if="grupo" id="registrar-pago" class="flex flex-col gap-4" novalidate @submit.prevent="$emit('guardar')">
      <div class="rounded-lg bg-tierra-100 p-3 dark:bg-tierra-800">
        <p class="mb-2 text-sm font-medium">
          {{ grupo.nombre }} · {{ nombreDelMes(grupo.mes) }} {{ grupo.mes.slice(0, 4) }}
        </p>
        <CifrasDelGrupo :grupo="grupo" />
        <p class="mt-2 text-xs text-tierra-600 dark:text-tierra-300">
          Plazo: {{ formatearFecha(grupo.plazo) }}. {{ textos.variosPagos }}
        </p>
      </div>
      <CampoTexto
        v-model="pago.fechaDePago"
        tipo="date"
        :etiqueta="textos.fechaDePago"
        :maximo="fechaDeHoy()"
        :error="errores.fechaDePago"
        requerido
      />
      <CampoTexto
        v-model="pago.documentoDePago"
        :etiqueta="textos.documentoDePago"
        :ayuda="textos.documentoDePagoAyuda"
        :error="errores.documentoDePago"
        :longitud-maxima="40"
        sin-correccion
        requerido
      />
      <CampoTexto
        v-model="pago.impuesto"
        :etiqueta="textos.impuesto"
        :error="errores.impuesto"
        paso="any"
        placeholder="0.00"
        requerido
      />
      <p v-if="faltante !== null" class="-mt-2 text-sm" role="status">
        <template v-if="faltante === '0.00'">Con este pago el mes y grupo quedan al día.</template>
        <template v-else-if="faltante.startsWith('-')">
          Con este pago se pagarían {{ formatearMonto(faltante.slice(1)) }} de más.
        </template>
        <template v-else>Con este pago todavía faltarían {{ formatearMonto(faltante) }}.</template>
      </p>
      <details
        class="rounded-lg ring-1 ring-tierra-200 dark:ring-tierra-700"
        :open="tieneAccesorios(pago) || !!(errores.multa || errores.intereses || errores.mora)"
      >
        <summary class="cursor-pointer select-none px-3 py-2 text-sm font-medium">{{ textos.accesorios }}</summary>
        <div class="flex flex-col gap-3 px-3 pb-3">
          <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ textos.accesoriosAyuda }}</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CampoTexto
              v-model="pago.multa"
              :etiqueta="textos.multa"
              :error="errores.multa"
              paso="any"
              placeholder="0.00"
            />
            <CampoTexto
              v-model="pago.intereses"
              :etiqueta="textos.intereses"
              :error="errores.intereses"
              paso="any"
              placeholder="0.00"
            />
            <CampoTexto
              v-model="pago.mora"
              :etiqueta="textos.mora"
              :error="errores.mora"
              paso="any"
              placeholder="0.00"
            />
          </div>
        </div>
      </details>
      <p
        class="flex items-baseline justify-between gap-2 rounded-lg bg-tierra-100 px-3 py-2 text-sm dark:bg-tierra-800"
      >
        <span>{{ textos.totalDeLaBoleta }}</span>
        <strong class="tabular-nums" role="status">{{ formatearMonto(total) }}</strong>
      </p>
      <CampoTexto
        v-model="pago.observaciones"
        :etiqueta="textos.observaciones"
        :error="errores.observaciones"
        :longitud-maxima="300"
        multilinea
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="registrar-pago" :cargando="enviando">{{ textos.guardar }}</BotonBase>
    </template>
  </VentanaModal>
</template>
