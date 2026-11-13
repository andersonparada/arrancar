<script setup lang="ts">
import { computed, watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  opcionesDeProveedorParaCargar,
  opcionesDeTipoDeSaldo,
} from '../../composables/saldos-iniciales/detalles-de-saldo-inicial';
import {
  aplicarPropuesta,
  esNotaDeCredito,
  type EdicionDeSaldoInicial,
} from '../../composables/saldos-iniciales/edicion-de-saldo-inicial';
import type { ProveedorParaSaldo } from '../../servicios/tipos-de-saldos-iniciales';
import {
  AYUDA_DE_REFERENCIA,
  AYUDA_DE_RETENCIONES,
  AYUDA_DE_RETENCIONES_POR_PRACTICAR,
  AYUDA_DE_SALDO_PENDIENTE,
  AYUDA_DE_VENCIMIENTO,
  AYUDA_DEL_TIPO,
} from '../../textos';

/** Los campos del saldo inicial. La nota de crédito oculta el vencimiento y las retenciones. */
const props = defineProps<{ errores: Record<string, string>; proveedores: ProveedorParaSaldo[] }>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });

const tipos = opcionesDeTipoDeSaldo();
const opcionesDeProveedor = computed(() => opcionesDeProveedorParaCargar(props.proveedores, edicion.value.proveedorId));
const esNota = computed(() => esNotaDeCredito(edicion.value.tipo));

// Mientras el usuario no escriba el saldo pendiente, se propone el total menos las retenciones.
watch(
  () => [edicion.value.total, edicion.value.retenciones, edicion.value.tipo],
  () => aplicarPropuesta(edicion.value),
);

function escribirSaldo(valor: string | number | null | undefined): void {
  edicion.value.saldoPendiente = valor ?? '';
  edicion.value.saldoEscrito = String(valor ?? '').trim() !== '';
}
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.proveedorId"
      etiqueta="Proveedor"
      :opciones="opcionesDeProveedor"
      requerido
      :error="errores.proveedorId"
    />
    <CampoSelector
      v-model="edicion.tipo"
      etiqueta="Tipo de documento"
      :opciones="tipos"
      requerido
      :error="errores.tipo"
    />
    <p class="-mt-2 text-xs text-tierra-500">{{ AYUDA_DEL_TIPO }}</p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto v-model="edicion.serie" etiqueta="Serie" sin-correccion :error="errores.serie" />
      <CampoTexto v-model="edicion.numero" etiqueta="Número" requerido sin-correccion :error="errores.numero" />
    </div>
    <CampoTexto
      v-model="edicion.referencia"
      etiqueta="Referencia del sistema anterior"
      :longitud-maxima="60"
      :ayuda="AYUDA_DE_REFERENCIA"
      :error="errores.referencia"
    />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.fechaEmision"
        etiqueta="Fecha de emisión"
        tipo="date"
        requerido
        :error="errores.fechaEmision"
      />
      <CampoTexto
        v-if="!esNota"
        v-model="edicion.vencimiento"
        etiqueta="Vencimiento"
        tipo="date"
        :ayuda="AYUDA_DE_VENCIMIENTO"
        :error="errores.vencimiento"
      />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto v-model="edicion.total" etiqueta="Total" tipo="number" paso="any" requerido :error="errores.total" />
      <CampoTexto
        v-if="!esNota"
        v-model="edicion.retenciones"
        etiqueta="Retenciones (todas)"
        tipo="number"
        paso="any"
        :ayuda="AYUDA_DE_RETENCIONES"
        :error="errores.retenciones"
      />
    </div>
    <CampoTexto
      v-if="!esNota"
      v-model="edicion.retencionesPorPracticar"
      etiqueta="Retenciones por practicar"
      tipo="number"
      paso="any"
      :ayuda="AYUDA_DE_RETENCIONES_POR_PRACTICAR"
      :error="errores.retencionesPorPracticar"
    />
    <CampoTexto
      :model-value="edicion.saldoPendiente"
      etiqueta="Saldo pendiente"
      tipo="number"
      paso="any"
      requerido
      :ayuda="AYUDA_DE_SALDO_PENDIENTE"
      :error="errores.saldoPendiente"
      @update:model-value="escribirSaldo"
    />
    <CampoInterruptor v-model="edicion.tieneActivoFijo" etiqueta="Incluye un activo fijo" />
  </div>
</template>
