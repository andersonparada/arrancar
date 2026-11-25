<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { camposQueAplican, conRubro, conTipo, ejemploDeCodigo } from '../composables/edicion-de-cuenta';
import {
  OPCIONES_DE_FLUJO,
  OPCIONES_DE_NATURALEZA,
  OPCIONES_DE_TIPO,
  OPCIONES_DE_TRATAMIENTO,
} from '../composables/opciones-de-cuenta';
import { opcionesDeRubro } from '../composables/rubros';
import type { DatosDeCuenta } from '../servicios/cuentas.api';

/**
 * Los campos de una cuenta. El código no cambia una vez creada; el tipo lo fija la cuenta superior. Lo que no aplica
 * a la cuenta (rubro de una cuenta de mayor, tratamiento fiscal del balance…) no se muestra.
 */
const props = defineProps<{
  esNueva: boolean;
  tieneSuperior: boolean;
  mascara: string;
  errores: Record<string, string>;
}>();
const datos = defineModel<DatosDeCuenta>({ required: true });

const aplica = computed(() => camposQueAplican(datos.value));
const opcionesDeRubroDelTipo = computed(() => [
  { valor: null as string | null, texto: 'Sin elegir' },
  ...opcionesDeRubro(datos.value.tipo),
]);
const ayudaDelCodigo = computed(() => `Formato ${props.mascara} (por ejemplo ${ejemploDeCodigo(props.mascara)}).`);
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      v-model="datos.codigo"
      etiqueta="Código"
      requerido
      sin-correccion
      :solo-lectura="!esNueva"
      :ayuda="esNueva ? ayudaDelCodigo : 'El código no se cambia después de crear la cuenta.'"
      :error="errores.codigo"
    />
    <CampoTexto v-model="datos.nombre" etiqueta="Nombre" requerido :longitud-maxima="150" :error="errores.nombre" />
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoSelector
        :model-value="datos.tipo"
        etiqueta="Tipo"
        requerido
        :opciones="OPCIONES_DE_TIPO"
        :deshabilitado="tieneSuperior"
        :error="errores.tipo"
        @update:model-value="(tipo) => (datos = conTipo(datos, tipo!))"
      />
      <CampoSelector
        v-model="datos.naturaleza"
        etiqueta="Naturaleza"
        requerido
        :opciones="OPCIONES_DE_NATURALEZA"
        :error="errores.naturaleza"
      />
    </div>
    <CampoInterruptor
      v-model="datos.esDeDetalle"
      etiqueta="Cuenta de detalle"
      descripcion="Recibe movimientos y no tiene cuentas inferiores. Las de mayor solo agrupan."
    />

    <fieldset
      v-if="aplica.clasificacion"
      class="min-w-0 space-y-4 border-t border-tierra-200 pt-4 dark:border-tierra-700"
    >
      <legend class="sr-only">Clasificación en los estados financieros</legend>
      <CampoSelector
        :model-value="datos.rubro"
        etiqueta="Rubro del estado financiero"
        requerido
        :opciones="opcionesDeRubroDelTipo"
        :error="errores.rubro"
        @update:model-value="(rubro) => (datos = conRubro(datos, rubro ?? null))"
      />
      <CampoInterruptor
        v-if="aplica.corriente"
        v-model="datos.corriente"
        etiqueta="Corriente"
        descripcion="Se espera cobrar o pagar en menos de un año."
      />
      <CampoSelector
        v-if="aplica.claseDeFlujo"
        v-model="datos.claseDeFlujo"
        etiqueta="Clase de flujo de efectivo"
        requerido
        :opciones="[{ valor: null, texto: 'Sin elegir' }, ...OPCIONES_DE_FLUJO]"
        :error="errores.claseDeFlujo"
      />
      <CampoInterruptor
        v-model="datos.pideTercero"
        etiqueta="Pide tercero"
        descripcion="Cada movimiento debe decir con qué cliente o proveedor es."
      />
      <CampoInterruptor
        v-model="datos.pideCentroDeCosto"
        etiqueta="Pide localidad o departamento"
        descripcion="Cada movimiento debe decir a qué área pertenece."
      />
      <CampoInterruptor
        v-model="datos.esMonetaria"
        etiqueta="Es monetaria"
        descripcion="Se reajusta con el tipo de cambio (Multimoneda)."
      />
      <CampoInterruptor
        v-model="datos.esDeControl"
        etiqueta="Cuenta de control"
        descripcion="Su detalle lo lleva un auxiliar (bancos, proveedores…). Los enlaces contables la marcan solos."
      />
    </fieldset>

    <CampoSelector
      v-if="aplica.tratamientoFiscal"
      v-model="datos.tratamientoFiscal"
      etiqueta="Tratamiento fiscal"
      :opciones="OPCIONES_DE_TRATAMIENTO"
      :error="errores.tratamientoFiscal"
    />
    <CampoInterruptor
      v-if="!esNueva"
      v-model="datos.activo"
      etiqueta="Activa"
      descripcion="Una cuenta inactiva ya no recibe movimientos ni enlaces. Para inactivarla debe estar sin saldo ni enlaces."
    />
  </div>
</template>
