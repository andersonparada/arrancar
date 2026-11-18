<script setup lang="ts">
import { computed, useId } from 'vue';
import { ChevronDown, ChevronRight, X } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';
import { claveDeProveedor } from '../composables/pagos/errores-del-reparto';
import {
  agregarContrasena,
  lineasDelProveedor,
  quitarContrasena,
  totalDelProveedor,
  type ProveedorDelReparto,
} from '../composables/pagos/reparto-de-efectivo';
import { avisoDeUmbral } from '../composables/pagos/resumen-del-reparto';
import CamposDelProveedorDelReparto from './CamposDelProveedorDelReparto.vue';
import CargosDelPago from './CargosDelPago.vue';

/**
 * Lo que se le entrega a un proveedor del reparto: sus cargos autorizados agrupados por contraseña, con el monto propuesto
 * editable, quién recibe, su recibo, la fecha y, si el servidor bloqueó el pago por bancarización, el motivo de la excepción.
 */
defineProps<{ errores: Record<string, string>; puedeSaldar: boolean; puedeSinBancarizar: boolean; hoy: string }>();
const proveedor = defineModel<ProveedorDelReparto>({ required: true });
defineEmits<{ quitar: [] }>();

const idDelCuerpo = useId();
const total = computed(() => formatearMonto(textoDeCentavos(totalDelProveedor(proveedor.value))));
const cuantos = computed(() => lineasDelProveedor(proveedor.value).length);
const aviso = computed(() => avisoDeUmbral(proveedor.value));
const alternar = (): void => {
  proveedor.value.abierto = !proveedor.value.abierto;
};
</script>

<template>
  <TarjetaBase role="group" :aria-label="`Pago a ${proveedor.nombre}`">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-campo-500"
        :aria-expanded="proveedor.abierto"
        :aria-controls="idDelCuerpo"
        @click="alternar"
      >
        <component
          :is="proveedor.abierto ? ChevronDown : ChevronRight"
          class="mt-1 size-4 shrink-0"
          aria-hidden="true"
        />
        <span class="min-w-0">
          <span class="block font-semibold break-words">{{ proveedor.nombre }}</span>
          <span class="block text-sm text-tierra-600 dark:text-tierra-300">
            <template v-if="proveedor.nit">NIT {{ formatearNit(proveedor.nit) }} · </template>
            {{ cuantos }} {{ cuantos === 1 ? 'documento' : 'documentos' }} · <strong>{{ total }}</strong>
          </span>
        </span>
      </button>
      <BotonBase variante="fantasma" pequeno :icono="X" @click="$emit('quitar')">Quitar</BotonBase>
    </div>

    <div v-show="proveedor.abierto" :id="idDelCuerpo" class="mt-4 space-y-4">
      <p v-if="proveedor.cargando" class="text-sm text-tierra-500" role="status">Cargando sus documentos…</p>
      <template v-else-if="proveedor.datos">
        <p
          v-if="errores[claveDeProveedor(proveedor.proveedorId, 'sinMonto')]"
          class="text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {{ errores[claveDeProveedor(proveedor.proveedorId, 'sinMonto')] }}
        </p>
        <CargosDelPago
          v-model="proveedor.edicion"
          :datos="proveedor.datos"
          :errores="errores"
          :puede-saldar="puedeSaldar"
          @agregar="agregarContrasena(proveedor, $event)"
          @quitar="quitarContrasena(proveedor, $event)"
        />
        <CamposDelProveedorDelReparto
          v-model="proveedor"
          :errores="errores"
          :hoy="hoy"
          :puede-sin-bancarizar="puedeSinBancarizar"
          :aviso="aviso"
        />
      </template>
    </div>
  </TarjetaBase>
</template>
