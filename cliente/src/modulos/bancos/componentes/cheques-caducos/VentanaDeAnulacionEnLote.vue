<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';

/**
 * La ventana única de la anulación en lote: fecha común de las notas inversas, motivo (obligatorio), un resumen de
 * lo que se va a crear y una casilla que hay que marcar para confirmar. Si el servidor rechaza algún cheque, aquí
 * se listan sus problemas: no se anuló ninguno.
 */
defineProps<{
  abierta: boolean;
  cantidad: number;
  monto: string;
  errores: Record<string, string>;
  problemas: string[];
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
const fecha = defineModel<string>('fecha', { required: true });
const confirmado = defineModel<boolean>('confirmado', { required: true });

const AYUDA_DE_LA_FECHA =
  'Todas las notas inversas llevan esta fecha: no puede ser posterior a hoy, anterior a la de algún cheque ni caer en un mes conciliado.';
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Anular cheques caducos" @cerrar="emit('cerrar')">
    <form id="form-de-anulacion-en-lote" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Se crearán {{ cantidad }} {{ cantidad === 1 ? 'nota de crédito' : 'notas de crédito' }} por
        {{ formatearMonto(monto) }} en la fecha {{ formatearFecha(fecha) }}. Los cheques quedan anulados y su número no
        se vuelve a usar. Anular no extingue la deuda con el beneficiario.
      </p>
      <CampoTexto
        v-model="fecha"
        etiqueta="Fecha de las notas inversas"
        tipo="date"
        requerido
        :ayuda="AYUDA_DE_LA_FECHA"
        :error="errores.fecha"
      />
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
      <label class="flex items-start gap-2 text-sm text-tierra-800 dark:text-tierra-100">
        <input v-model="confirmado" type="checkbox" class="mt-0.5 size-4 rounded" />
        <span>Entiendo que se anularán {{ cantidad }} cheques y que esto no se puede deshacer.</span>
      </label>
      <div
        v-if="problemas.length"
        role="alert"
        class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
      >
        <p class="font-medium">No se anuló ningún cheque. Quítalos de la selección o corrígelos:</p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="problema in problemas" :key="problema">{{ problema }}</li>
        </ul>
      </div>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase
        tipo="submit"
        form="form-de-anulacion-en-lote"
        variante="peligro"
        :cargando="enviando"
        :deshabilitado="!confirmado"
      >
        Anular {{ cantidad }} {{ cantidad === 1 ? 'cheque' : 'cheques' }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
