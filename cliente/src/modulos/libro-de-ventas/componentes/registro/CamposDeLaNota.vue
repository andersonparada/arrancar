<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { sinResultados, type BusquedaDeFacturas } from '../../composables/documentos/busqueda-de-facturas';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { esNota, tituloDeDocumento } from '../../composables/documentos/tipos-de-documento';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-de-documentos';

/** Solo en las notas: la factura que corrigen, de este sistema o de uno anterior. */
const props = defineProps<{ facturas: BusquedaDeFacturas; errores: Record<string, string> }>();
const emit = defineEmits<{ buscar: [texto: string] }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });
const texto = ref('');

// Otro cliente u otro tipo empiezan de cero; el composable ya trae la lista completa.
watch(
  () => [edicion.value.clienteId, edicion.value.tipo],
  () => (texto.value = ''),
);
const buscar = (nuevo: string): void => {
  texto.value = nuevo;
  emit('buscar', nuevo);
};

const opciones = computed(() => [
  { valor: null, texto: 'Escoja la factura' },
  ...props.facturas.elementos.map((factura) => ({
    valor: factura.id,
    texto: `${tituloDeDocumento(factura)} · ${formatearFecha(factura.fechaEmision)} · ${formatearMonto(factura.total)}`,
  })),
]);
const ayuda = computed(() => {
  const { cargando, fallo, elementos, hayMas } = props.facturas;
  if (cargando) return 'Buscando las facturas…';
  if (fallo) return textos.errorAlBuscarFacturas;
  if (elementos.length === 0) return sinResultados(edicion.value.clienteId, texto.value);
  return hayMas ? textos.hayMasFacturas : '';
});
</script>

<template>
  <fieldset
    v-if="esNota(edicion.tipo)"
    class="min-w-0 space-y-4 rounded-lg border border-tierra-200 p-3 dark:border-tierra-700"
  >
    <legend class="px-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">Factura que corrige</legend>
    <CampoInterruptor
      v-model="edicion.usaFacturaAnterior"
      etiqueta="Es de un sistema anterior"
      :descripcion="textos.ayudaDeLaFacturaAnterior"
    />
    <div v-if="!edicion.usaFacturaAnterior" class="space-y-1">
      <CampoTexto
        :model-value="texto"
        tipo="search"
        etiqueta="Buscar la factura"
        placeholder="Serie o número"
        sin-correccion
        @update:model-value="buscar(String($event ?? ''))"
      />
      <CampoSelector
        v-model="edicion.documentoAfectadoId"
        etiqueta="Factura"
        requerido
        :opciones="opciones"
        :error="errores.documentoAfectadoId"
      />
      <p v-if="ayuda" class="text-xs text-tierra-500" role="status">{{ ayuda }}</p>
      <BotonBase v-if="facturas.fallo && !facturas.cargando" variante="secundario" pequeno @click="buscar(texto)">
        Reintentar
      </BotonBase>
    </div>
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <CampoTexto v-model="edicion.facturaAnterior.serie" etiqueta="Serie" sin-correccion />
      <CampoTexto
        v-model="edicion.facturaAnterior.numero"
        etiqueta="Número"
        requerido
        sin-correccion
        :error="errores['facturaAnterior.numero']"
      />
      <CampoTexto
        v-model="edicion.facturaAnterior.fecha"
        tipo="date"
        etiqueta="Fecha"
        requerido
        :error="errores['facturaAnterior.fecha']"
      />
    </div>
  </fieldset>
</template>
