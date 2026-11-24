<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearCantidadDeInventario, formatearFecha } from '@/modulos/core/utilidades/formato';
import type { EdicionDeDevolucion } from '../../composables/recepciones/edicion-de-nota';

/** Devolver mercadería al proveedor: escribir cuánto de cada entrada de la factura vuelve (vacío = nada). */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const edicion = defineModel<EdicionDeDevolucion>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="`Devolver al proveedor · ${edicion.nota}`"
    ancha
    @cerrar="emit('cerrar')"
  >
    <form id="form-de-devolucion" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        La mercadería sale de la bodega donde entró, al costo con que entró. Escriba cuánto devuelve de cada entrada.
      </p>
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha de la devolución"
        tipo="date"
        requerido
        :error="errores.fecha"
      />
      <p v-if="errores.filas" role="alert" class="text-sm text-red-700 dark:text-red-300">{{ errores.filas }}</p>
      <ul class="space-y-3">
        <li
          v-for="(fila, indice) in edicion.filas"
          :key="fila.clave"
          class="rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
        >
          <p class="font-medium">
            {{ fila.articuloNombre }}
            <span class="text-sm font-normal text-tierra-500">({{ fila.articuloCodigo }})</span>
          </p>
          <p class="mb-2 text-xs text-tierra-500">
            Entró el {{ formatearFecha(fila.fecha) }}:
            {{ formatearCantidadDeInventario(fila.cantidad, fila.unidadBaseNombre) }}
            <template v-if="fila.bodegaNombre"> · {{ fila.bodegaNombre }}</template>
            <template v-if="fila.loteCodigo"> · Lote {{ fila.loteCodigo }}</template>
          </p>
          <CampoTexto
            v-model="fila.devolver"
            :etiqueta="`Cantidad a devolver (${fila.unidadBaseNombre})`"
            tipo="number"
            paso="any"
            :error="errores[`filas.${indice}`]"
          />
        </li>
      </ul>
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-devolucion" :cargando="enviando">Devolver</BotonBase>
    </template>
  </VentanaModal>
</template>
