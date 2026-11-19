<script setup lang="ts">
import { computed } from 'vue';
import {
  detalleDeLaFila,
  esCruce,
  NOTA_DE_LA_POLITICA_DE_CRUCES,
} from '../../composables/plataforma/convenciones-del-banguat';
import { vigenteDelDia, type FormularioDeTipo } from '../../composables/plataforma/edicion-de-tipo-manual';
import { formatearFecha, formatearFechaHora, formatearTipoDeCambio } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import InsigniaBase from '../InsigniaBase.vue';
import VentanaModal from '../VentanaModal.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean; cargandoVersiones: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const tipo = defineModel<FormularioDeTipo>({ required: true });

const titulo = computed(() =>
  tipo.value.fechaFija
    ? `${tipo.value.moneda} · ${formatearFecha(tipo.value.fecha)}`
    : `Ingresar tipo de ${tipo.value.moneda}`,
);
const vigente = computed(() => vigenteDelDia(tipo.value));
</script>

<template>
  <VentanaModal :abierta="tipo.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-tipo" class="space-y-4" @submit.prevent="emit('guardar')">
      <CampoTexto
        v-model="tipo.fecha"
        etiqueta="Día al que corresponde"
        tipo="date"
        requerido
        :solo-lectura="tipo.fechaFija"
        :error="errores.fecha"
      />
      <CampoTexto
        v-model="tipo.referencia"
        etiqueta="Tipo de cambio de referencia"
        requerido
        placeholder="Ej. 7.64489"
        autocompletar="off"
        :ayuda="`Quetzales por una unidad de ${tipo.moneda} (ya convertido: no el cruce publicado en dólares), con punto y hasta 8 decimales.`"
        :error="errores.referencia"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="tipo.compra" etiqueta="Compra (opcional)" autocompletar="off" :error="errores.compra" />
        <CampoTexto v-model="tipo.venta" etiqueta="Venta (opcional)" autocompletar="off" :error="errores.venta" />
      </div>
      <CampoTexto
        v-model="tipo.motivo"
        etiqueta="Motivo"
        multilinea
        requerido
        contar
        :longitud-maxima="300"
        placeholder="Ej. El Banguat no publicó el valor; se tomó del comprobante del banco."
        :error="errores.motivo"
      />
    </form>

    <section class="mt-5" aria-labelledby="titulo-historial">
      <h3 id="titulo-historial" class="text-sm font-semibold">Historial del día</h3>
      <p v-if="cargandoVersiones" class="mt-1 text-sm text-tierra-500">Cargando…</p>
      <p v-else-if="!tipo.versiones.length" class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
        Este día aún no tiene tipo. Al guardar queda como el valor manual vigente.
      </p>
      <ol v-else class="mt-2 divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
        <li v-for="version in tipo.versiones" :key="version.id" class="py-2">
          <p class="flex flex-wrap items-center gap-2">
            <span class="font-medium tabular-nums">Q {{ formatearTipoDeCambio(version.referencia) }}</span>
            <InsigniaBase :tono="version.origen === 'manual' ? 'trigo' : 'tierra'">
              {{ version.origen === 'manual' ? 'Manual' : 'Banguat' }}
            </InsigniaBase>
            <InsigniaBase v-if="version.id === vigente?.id" tono="campo">Vigente</InsigniaBase>
          </p>
          <p class="text-xs text-tierra-600 dark:text-tierra-300">
            {{ formatearFechaHora(version.registradoEn) }}
            <template v-if="version.registradoPor"> · {{ version.registradoPor }}</template>
          </p>
          <p
            v-for="linea in detalleDeLaFila(version)"
            :key="linea"
            class="text-xs wrap-break-word text-tierra-600 dark:text-tierra-300"
          >
            {{ linea }}
          </p>
          <p v-if="esCruce(version.convencion)" class="text-xs text-tierra-500 dark:text-tierra-400">
            {{ NOTA_DE_LA_POLITICA_DE_CRUCES }}
          </p>
          <p v-if="version.motivo" class="text-xs wrap-break-word text-tierra-600 dark:text-tierra-300">
            {{ version.motivo }}
          </p>
        </li>
      </ol>
    </section>

    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-tipo" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
