<script setup lang="ts">
import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearMonto, formatearNit, formatearTexto } from '@/modulos/core/utilidades/formato';
import { NOMBRES_DE_DESTINO } from '../composables/anticipos/ficha-de-anticipo';
import { documentoDelAnticipo } from '../composables/anticipos/lista-de-anticipos';
import { montoDelGasto, tituloDelGasto } from '../composables/gastos/gastos-del-anticipo';
import {
  autorizacionDelDescuento,
  cuadroDeLaLiquidacion,
  separarLosGastos,
  sumaDeLosGastos,
} from '../composables/liquidacion/liquidacion-impresa';
import type { Anticipo } from '../servicios/tipos-de-anticipos';
import type { Gasto } from '../servicios/tipos-de-gastos';

/** La liquidación en una hoja carta, siempre blanca con letra negra (también en modo oscuro), lista para firmar. */
const props = defineProps<{ anticipo: Anticipo; gastos: Gasto[] }>();
const sesion = usarSesion();
const grupos = computed(() => separarLosGastos(props.gastos));
const cuadro = computed(() => cuadroDeLaLiquidacion(props.anticipo));
const autorizacion = computed(() => autorizacionDelDescuento(props.anticipo));
const linea = 'mt-10 border-t border-black pt-1 text-xs';
</script>

<template>
  <article
    class="hoja mx-auto w-full max-w-[8.5in] space-y-4 bg-white p-4 text-black ring-1 ring-tierra-300 sm:p-8 print:max-w-none print:p-0 print:ring-0"
    aria-label="Liquidación del anticipo"
  >
    <header class="flex flex-wrap items-start justify-between gap-2 border-b-2 border-black pb-2">
      <div>
        <p class="text-lg font-bold">{{ formatearTexto(sesion.empresa?.nombre) }}</p>
        <p v-if="sesion.empresa?.nit" class="text-sm">NIT {{ formatearNit(sesion.empresa.nit) }}</p>
      </div>
      <p class="border-2 border-black px-3 py-1 text-sm font-bold tracking-wide">LIQUIDACIÓN DE ANTICIPO</p>
    </header>

    <h2 class="text-xl font-bold">Liquidación del anticipo No. {{ anticipo.numero }}</h2>

    <dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div>
        <dt class="inline font-semibold">Beneficiario:</dt>
        <dd class="ml-1 inline">{{ anticipo.beneficiario }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Entrega:</dt>
        <dd class="ml-1 inline">{{ formatearFecha(anticipo.fecha) }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Documento en Bancos:</dt>
        <dd class="ml-1 inline">{{ documentoDelAnticipo(anticipo.forma, anticipo.movimiento.numero) }}</dd>
      </div>
      <div v-if="anticipo.liquidacion">
        <dt class="inline font-semibold">Liquidación:</dt>
        <dd class="ml-1 inline">{{ formatearFecha(anticipo.liquidacion.fecha) }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="inline font-semibold">Para:</dt>
        <dd class="ml-1 inline">{{ anticipo.descripcion }}</dd>
      </div>
    </dl>

    <section
      v-for="grupo in [
        { titulo: 'Gastos con documento', gastos: grupos.conDocumento },
        { titulo: 'Gastos sin documento (no sustentados)', gastos: grupos.sinDocumento },
      ]"
      :key="grupo.titulo"
    >
      <template v-if="grupo.gastos.length > 0">
        <h3 class="mb-1 text-sm font-bold">{{ grupo.titulo }}</h3>
        <table class="w-full border-collapse text-sm">
          <caption class="sr-only">
            {{
              grupo.titulo
            }}
          </caption>
          <thead>
            <tr class="border-y-2 border-black text-left">
              <th scope="col" class="py-1 pr-2">Fecha</th>
              <th scope="col" class="py-1 pr-2">Detalle</th>
              <th scope="col" class="py-1 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gasto in grupo.gastos" :key="gasto.id" class="border-b border-black/40 align-top">
              <td class="py-1 pr-2 whitespace-nowrap">{{ formatearFecha(gasto.fecha) }}</td>
              <td class="py-1 pr-2 break-words">
                {{ tituloDelGasto(gasto) }}<template v-if="gasto.proveedor"> · {{ gasto.proveedor }}</template
                ><template v-else-if="gasto.pagadoA"> · pagado a {{ gasto.pagadoA }}</template>
              </td>
              <td class="py-1 text-right">{{ montoDelGasto(gasto) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-semibold">
              <td colspan="2" class="py-1 pr-2 text-right">Subtotal</td>
              <td class="py-1 text-right">{{ formatearMonto(sumaDeLosGastos(grupo.gastos)) }}</td>
            </tr>
          </tfoot>
        </table>
      </template>
    </section>

    <table class="ml-auto w-full max-w-sm border-collapse text-sm">
      <caption class="sr-only">
        Cuadro de la liquidación
      </caption>
      <tbody>
        <tr v-for="fila in cuadro" :key="fila.etiqueta" class="border-b border-black/40">
          <th scope="row" class="py-1 pr-2 text-left font-normal">{{ fila.etiqueta }}</th>
          <td class="py-1 text-right font-semibold">{{ fila.valor }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="anticipo.liquidacion?.destinoDeNoLiquidado" class="text-sm">
      <strong>Lo no liquidado:</strong> {{ NOMBRES_DE_DESTINO[anticipo.liquidacion.destinoDeNoLiquidado] }}.
      <template v-if="anticipo.liquidacion.motivoDeNoLiquidado"
        >Motivo: {{ anticipo.liquidacion.motivoDeNoLiquidado }}</template
      >
    </p>

    <div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3 print:grid-cols-3">
      <p :class="linea">Beneficiario: nombre, firma y fecha</p>
      <p :class="linea">Revisó: nombre, firma y fecha</p>
      <p :class="linea">Autorizó: nombre, firma y fecha</p>
    </div>

    <section v-if="autorizacion" class="border-2 border-black p-3 text-sm">
      <h3 class="font-bold">Autorización de descuento en cuotas</h3>
      <p class="mt-1">{{ autorizacion }}</p>
      <p :class="linea">Firma del beneficiario y fecha</p>
    </section>
  </article>
</template>
