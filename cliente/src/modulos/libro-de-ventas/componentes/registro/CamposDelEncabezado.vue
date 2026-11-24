<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  conCliente,
  conTipo,
  nitDelCliente,
  type EdicionDeDocumento,
} from '../../composables/documentos/edicion-de-documento';
import type { BusquedaDeFacturas } from '../../composables/documentos/busqueda-de-facturas';
import { estaDerogado, opcionesDeTipo } from '../../composables/documentos/tipos-de-documento';
import type { ClienteParaVentas, TipoDeDocumento } from '../../servicios/documentos.api';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-de-documentos';
import CamposDeLaNota from './CamposDeLaNota.vue';

/** Lo básico de un documento: tipo, fecha, serie y número, cliente y, si es nota, la factura que corrige. */
const props = defineProps<{
  clientes: ClienteParaVentas[];
  clientesNoDisponibles: boolean;
  facturas: BusquedaDeFacturas;
  errores: Record<string, string>;
}>();
const emit = defineEmits<{ buscarFacturas: [texto: string] }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const tipos = opcionesDeTipo();
const opcionesDeCliente = computed(() => [
  { valor: null, texto: 'Consumidor final (sin cliente)' },
  ...props.clientes.map(({ id, nombre }) => ({ valor: id, texto: nombre })),
]);
const nit = computed(() => nitDelCliente(props.clientes, edicion.value.clienteId));
const ayudaDelCliente = computed(() => {
  if (props.clientesNoDisponibles) return textos.sinClientes;
  if (!edicion.value.clienteId) return textos.consumidorFinal;
  return nit.value ? `NIT del cliente: ${nit.value}` : 'El cliente no tiene NIT guardado: escríbalo en «Más datos».';
});
const cambiarTipo = (tipo: TipoDeDocumento): void => {
  Object.assign(edicion.value, conTipo(edicion.value, tipo));
};
const cambiarCliente = (clienteId: string | null): void => {
  Object.assign(edicion.value, conCliente(edicion.value, clienteId));
};
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-1">
      <CampoSelector
        :model-value="edicion.tipo"
        etiqueta="Tipo de documento"
        requerido
        :opciones="tipos"
        :error="errores.tipo"
        @update:model-value="cambiarTipo($event as TipoDeDocumento)"
      />
      <p v-if="estaDerogado(edicion.tipo)" class="text-xs text-trigo-700 dark:text-trigo-300">{{ textos.derogado }}</p>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <CampoTexto
        v-model="edicion.fechaEmision"
        tipo="date"
        etiqueta="Fecha de emisión"
        requerido
        :error="errores.fechaEmision"
      />
      <CampoTexto v-model="edicion.serie" etiqueta="Serie" sin-correccion :error="errores.serie" />
      <CampoTexto v-model="edicion.numero" etiqueta="Número" requerido sin-correccion :error="errores.numero" />
    </div>
    <div class="space-y-1">
      <CampoSelector
        :model-value="edicion.clienteId"
        etiqueta="Cliente"
        :opciones="opcionesDeCliente"
        :error="errores.clienteId"
        @update:model-value="cambiarCliente($event ?? null)"
      />
      <p class="text-xs text-tierra-500">{{ ayudaDelCliente }}</p>
    </div>
    <CamposDeLaNota
      v-model="edicion"
      :facturas="facturas"
      :errores="errores"
      @buscar="emit('buscarFacturas', $event)"
    />
  </div>
</template>
