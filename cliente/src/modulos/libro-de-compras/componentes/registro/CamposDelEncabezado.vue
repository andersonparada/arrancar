<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  esFacturaEspecial,
  familiaDelCodigo,
  opcionesDeTipoSat,
} from '../../composables/documentos/tipos-de-documento-sat';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import {
  opcionesDeDestinos,
  opcionesDeFacturas,
  opcionesDePeriodoDelDocumento,
  opcionesDeProveedores,
} from '../../composables/documentos/reglas-del-formulario-de-documento';
import type { DestinoDeDocumento, DocumentoEnLista } from '../../servicios/documentos.api';
import type { ProveedorParaRegistro } from '../../servicios/registro-de-documentos.api';

/** Quién, qué y cuándo: tipo, proveedor, destino, factura que rebaja la nota, número, fechas y período. */
const props = defineProps<{
  proveedores: ProveedorParaRegistro[];
  destinos: DestinoDeDocumento[];
  facturas: DocumentoEnLista[];
  periodoPropuesto: string | null;
  fechaPropuesta: string | null;
  errores: Record<string, string>;
}>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const tipos = opcionesDeTipoSat();
const opcionesDeProveedor = computed(() => [
  { valor: null, texto: 'Elija un proveedor' },
  ...opcionesDeProveedores(props.proveedores),
]);
const opcionesDeDestino = computed(() => [
  { valor: null, texto: 'Elija el destino' },
  ...opcionesDeDestinos(props.destinos),
]);
const facturasDeLaNota = computed(() => [
  { valor: null, texto: props.facturas.length ? 'Elija la factura' : 'Este proveedor no tiene facturas vigentes' },
  ...opcionesDeFacturas(props.facturas),
]);
const periodos = computed(() =>
  opcionesDePeriodoDelDocumento(new Date(), edicion.value.periodo, props.periodoPropuesto),
);
const esEspecial = computed(() => esFacturaEspecial(edicion.value.tipoDte));
const ayudaDeLaRecepcion = computed(() => {
  if (esEspecial.value) return 'Se propone igual a la fecha de emisión.';
  return props.fechaPropuesta
    ? `Si la deja vacía se usa ${props.fechaPropuesta}.`
    : 'Si la deja vacía se usa la de hoy.';
});
const esNota = computed(() => familiaDelCodigo(edicion.value.tipoDte) === 'nota_de_credito');
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <CampoSelector
      v-model="edicion.tipoDte"
      class="sm:col-span-2 lg:col-span-3"
      etiqueta="Tipo de documento (como dice el encabezado de la factura)"
      requerido
      :opciones="tipos"
      :error="errores.tipoDte"
    />
    <CampoSelector
      v-model="edicion.proveedorId"
      etiqueta="Proveedor"
      requerido
      :opciones="opcionesDeProveedor"
      :error="errores.proveedorId"
    />
    <CampoSelector
      v-if="destinos.length > 0"
      v-model="edicion.destino"
      etiqueta="Destino"
      requerido
      :deshabilitado="esNota && !!edicion.documentoAfectadoId"
      :opciones="opcionesDeDestino"
      :error="errores.destino"
    />
    <CampoSelector
      v-if="esNota"
      v-model="edicion.documentoAfectadoId"
      class="sm:col-span-2 lg:col-span-3"
      etiqueta="Factura que rebaja esta nota"
      requerido
      :opciones="facturasDeLaNota"
      :error="errores.documentoAfectadoId"
    />
    <CampoTexto
      v-model="edicion.serie"
      etiqueta="Serie"
      :requerido="esEspecial"
      :longitud-maxima="40"
      :error="errores.serie"
      sin-correccion
    />
    <CampoTexto
      v-model="edicion.numero"
      etiqueta="Número"
      requerido
      :longitud-maxima="40"
      :error="errores.numero"
      sin-correccion
    />
    <CampoTexto
      v-model="edicion.fechaEmision"
      tipo="date"
      etiqueta="Fecha de emisión"
      requerido
      :error="errores.fechaEmision"
    />
    <CampoTexto
      v-model="edicion.fechaRecepcion"
      tipo="date"
      etiqueta="Fecha de recepción"
      :ayuda="ayudaDeLaRecepcion"
      :error="errores.fechaRecepcion"
    />
    <CampoSelector
      v-model="edicion.periodo"
      etiqueta="Período del libro"
      :opciones="periodos"
      :error="errores.periodo"
    />
  </div>
</template>
