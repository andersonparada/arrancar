<script setup lang="ts">
import { computed } from 'vue';
import { Hourglass, Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import BloqueDeSaldos from '../componentes/reportes/BloqueDeSaldos.vue';
import ConciliacionDeSaldos from '../componentes/reportes/ConciliacionDeSaldos.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeSaldos from '../componentes/reportes/FiltrosDeSaldos.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import PorcentajesPorTramo from '../componentes/reportes/PorcentajesPorTramo.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeSaldos } from '../composables/reportes/filtros-de-saldos';
import {
  filasDeConciliacion,
  reporteDeSaldosVacio,
  totalesDeSaldos,
} from '../composables/reportes/resumen-de-reportes';
import { usarReporteDeSaldos } from '../composables/reportes/usar-reporte-de-saldos';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.saldosPorProveedor;
const r = usarReporteDeSaldos();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeSaldos(r.filtros, nombreDelProveedor.value));
const conciliacion = computed(() => (r.reporte.value ? filasDeConciliacion(r.reporte.value) : null));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeSaldos
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :error-del-corte="r.errorDelCorte.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <p
          v-if="r.avisoDelCorte.value"
          class="flex gap-2 rounded-xl bg-trigo-300/30 px-3 py-2 text-sm text-tierra-800 dark:bg-trigo-500/15 dark:text-trigo-300"
          role="status"
        >
          <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{{ r.avisoDelCorte.value }}</span>
        </p>
        <TotalesDelReporte :totales="totalesDeSaldos(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="reporteDeSaldosVacio(r.reporte.value)"
          :icono="Hourglass"
          titulo="Ningún proveedor tiene saldo al corte"
          :descripcion="`No hay saldos al ${formatearFecha(r.reporte.value.corte)} con estos filtros. Pruebe con otra fecha de corte o incluya los proveedores sin saldo.`"
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <BloqueDeSaldos
            v-if="r.reporte.value.acreedores.length"
            titulo="Proveedores con saldo acreedor"
            descripcion="Lo que la empresa les debe (neto de sus saldos a favor)."
            :filas="r.reporte.value.acreedores"
            :totales="r.reporte.value.totales.acreedores"
            :corte="r.reporte.value.corte"
          />
          <BloqueDeSaldos
            v-if="r.reporte.value.deudores.length"
            titulo="Proveedores con saldo deudor"
            descripcion="Lo que los proveedores le deben a la empresa (saldos a favor mayores que lo adeudado), en positivo."
            :filas="r.reporte.value.deudores"
            :totales="r.reporte.value.totales.deudores"
            :corte="r.reporte.value.corte"
            deudor
          />
          <PorcentajesPorTramo :totales="r.reporte.value.totales" />
        </template>
        <ConciliacionDeSaldos v-if="conciliacion" :filas="conciliacion" :corte="r.reporte.value.corte" />
        <LeyendasDelReporte :avisos="r.reporte.value.avisos" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
