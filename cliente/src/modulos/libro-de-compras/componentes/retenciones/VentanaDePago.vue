<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { PagoEnEdicion } from '../../composables/retenciones/datos-de-pagos';
import { nombreDelMes } from '../../composables/retenciones/datos-de-pagos';
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
    <form v-if="grupo" id="registrar-pago" class="flex flex-col gap-4" @submit.prevent="$emit('guardar')">
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
        v-model="pago.monto"
        :etiqueta="textos.monto"
        :error="errores.monto"
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
