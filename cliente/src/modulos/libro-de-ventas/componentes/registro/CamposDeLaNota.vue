<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { esNota, tituloDeDocumento } from '../../composables/documentos/tipos-de-documento';
import type { DocumentoEnLista } from '../../servicios/documentos.api';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-de-documentos';

/** Solo en las notas: la factura que corrigen, de este sistema o de uno anterior. */
const props = defineProps<{ facturas: DocumentoEnLista[]; cargando: boolean; errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const opciones = computed(() => [
  { valor: null, texto: 'Escoja la factura' },
  ...props.facturas.map((factura) => ({
    valor: factura.id,
    texto: `${tituloDeDocumento(factura)} · ${formatearFecha(factura.fechaEmision)} · ${formatearMonto(factura.total)}`,
  })),
]);
const ayuda = computed(() => {
  if (!edicion.value.clienteId) return textos.sinCliente;
  if (props.cargando) return 'Buscando las facturas del cliente…';
  return props.facturas.length === 0 ? textos.sinFacturasDelCliente : '';
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
      <CampoSelector
        v-model="edicion.documentoAfectadoId"
        etiqueta="Factura"
        requerido
        :opciones="opciones"
        :deshabilitado="!edicion.clienteId"
        :error="errores.documentoAfectadoId"
      />
      <p v-if="ayuda" class="text-xs text-tierra-500">{{ ayuda }}</p>
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
