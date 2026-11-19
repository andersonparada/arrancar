<script setup lang="ts">
import { FilePlus2, Inbox, ReceiptText } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Comprobante, EstadoDeLosComprobantes, ListaDeComprobantes } from '../servicios/tipos-de-comprobantes';
import FilaDeComprobante from './FilaDeComprobante.vue';

/** Los comprobantes del fondo con lo que se hace con ellos: agregar una factura, tomarla de la bandeja o hacer un vale. */
defineProps<{
  lista: ListaDeComprobantes;
  cargando: boolean;
  /** Se puede cambiar (devolver, anular): el fondo está abierto. */
  puedeCambiar: boolean;
}>();
const estado = defineModel<EstadoDeLosComprobantes>('estado', { required: true });
const emit = defineEmits<{
  agregarFactura: [];
  desdeLaBandeja: [];
  valeDeGasto: [];
  devolver: [comprobante: Comprobante];
  anular: [comprobante: Comprobante];
}>();

/** «Agregar factura» abre Ingreso de facturas del libro de compras: hace falta poder registrar allá. */
const puedeRegistrarEnElLibro = usarSesion().puede('libro-de-compras.documentos.crear');

const opciones = [
  { valor: 'pendiente', texto: 'Pendientes de reponer' },
  { valor: 'repuesto', texto: 'Ya repuestos' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'todos', texto: 'Todos' },
] satisfies { valor: EstadoDeLosComprobantes; texto: string }[];
</script>

<template>
  <section aria-labelledby="titulo-de-comprobantes" class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="titulo-de-comprobantes" class="text-lg font-semibold">Comprobantes</h2>
        <p class="text-sm text-tierra-600 dark:text-tierra-300" aria-live="polite">
          Pendiente de reponer: <strong>{{ formatearMonto(lista.totales.pendiente) }}</strong>
        </p>
      </div>
      <div v-if="puedeCambiar" v-permiso="'caja-chica.comprobantes.crear'" class="flex flex-wrap gap-2">
        <BotonBase v-if="puedeRegistrarEnElLibro" :icono="FilePlus2" @click="emit('agregarFactura')"
          >Agregar factura</BotonBase
        >
        <BotonBase variante="secundario" :icono="Inbox" @click="emit('desdeLaBandeja')">Desde la bandeja</BotonBase>
        <BotonBase variante="secundario" :icono="ReceiptText" @click="emit('valeDeGasto')">Vale de gasto</BotonBase>
      </div>
    </div>
    <div class="max-w-xs">
      <CampoSelector v-model="estado" etiqueta="Mostrar" :opciones="opciones" />
    </div>

    <p v-if="cargando && lista.elementos.length === 0" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="lista.elementos.length === 0"
      :icono="ReceiptText"
      :titulo="estado === 'pendiente' ? 'No hay comprobantes pendientes' : 'No hay comprobantes en esta vista'"
      :descripcion="
        estado === 'pendiente'
          ? 'Agregue una factura, tome las de la bandeja o registre un vale de gasto para empezar a llevar la cuenta del fondo.'
          : undefined
      "
    />
    <ul v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2" :aria-busy="cargando">
      <li v-for="comprobante in lista.elementos" :key="comprobante.id">
        <FilaDeComprobante
          :comprobante="comprobante"
          :puede-cambiar="puedeCambiar"
          @devolver="emit('devolver', comprobante)"
          @anular="emit('anular', comprobante)"
        />
      </li>
    </ul>
  </section>
</template>
