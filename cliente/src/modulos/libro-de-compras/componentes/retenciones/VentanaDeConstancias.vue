<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  filasConProblemas,
  resumenDeConstancias,
  type ErroresPorFila,
  type FilaDeConstancia,
} from '../../composables/retenciones/datos-de-constancias';
import { nombreDelDocumento, textoDeCantidad } from '../../composables/retenciones/datos-de-retenciones';
import { VENTANA_DE_CONSTANCIAS as textos } from '../../textos-de-retenciones';

/**
 * Anota el número y la fecha de las constancias de las filas marcadas (o de una sola). Todo o nada: si el servidor
 * rechaza una fila, ninguna se guarda y el motivo sale en esa fila.
 */
const props = defineProps<{ abierta: boolean; enviando: boolean; errores: ErroresPorFila }>();
const filas = defineModel<FilaDeConstancia[]>('filas', { required: true });
const fechaParaTodas = defineModel<string>('fecha', { required: true });
defineEmits<{ guardar: []; cerrar: []; copiarFecha: [fecha: string] }>();

const resumen = computed(() => resumenDeConstancias(filas.value));
const unaSola = computed(() => filas.value.length === 1);
const conProblemas = computed(() => filasConProblemas(props.errores));
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="unaSola ? textos.tituloUna : textos.tituloVarias"
    ancha
    @cerrar="$emit('cerrar')"
  >
    <form id="anotar-constancias" class="flex flex-col gap-4" @submit.prevent="$emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ textos.explicacion }}</p>
      <CampoTexto
        v-if="!unaSola"
        v-model="fechaParaTodas"
        tipo="date"
        :etiqueta="textos.fechaParaTodas"
        :ayuda="textos.fechaParaTodasAyuda"
        @update:model-value="$emit('copiarFecha', String($event ?? ''))"
      />
      <p
        v-if="conProblemas > 0 && !unaSola"
        class="rounded-lg bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        No se guardó ninguna. Corrija {{ textoDeCantidad(conProblemas, 'fila marcada', 'filas marcadas') }} y vuelva a
        guardar.
      </p>
      <ul class="flex flex-col gap-3">
        <li
          v-for="(fila, indice) in filas"
          :key="fila.retencion.id"
          class="rounded-xl p-3 ring-1"
          :class="errores[indice] ? 'ring-red-400' : 'ring-tierra-200 dark:ring-tierra-700'"
        >
          <p class="mb-2 text-sm">
            <strong>{{ fila.retencion.proveedor.nombre }}</strong>
            · {{ nombreDelDocumento(fila.retencion.documento) }} · retención
            {{ formatearMonto(fila.retencion.retenido) }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <CampoTexto
              v-model="fila.numero"
              :etiqueta="textos.numero"
              :error="errores[indice]?.numero"
              :longitud-maxima="40"
              sin-correccion
              requerido
            />
            <CampoTexto
              v-model="fila.fecha"
              tipo="date"
              :etiqueta="textos.fecha"
              :error="errores[indice]?.fecha ?? errores[indice]?.retencionId"
              requerido
            />
          </div>
        </li>
      </ul>
      <p v-if="!unaSola" class="text-sm font-medium">
        {{ textoDeCantidad(resumen.cantidad, 'constancia', 'constancias') }} por {{ formatearMonto(resumen.total) }}
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="anotar-constancias" :cargando="enviando">{{ textos.guardar }}</BotonBase>
    </template>
  </VentanaModal>
</template>
