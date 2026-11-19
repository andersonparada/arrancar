<script setup lang="ts">
import { computed } from 'vue';
import { Banknote } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDePagosRealizados from '../componentes/reportes/FiltrosDePagosRealizados.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TablaDePagosRealizados from '../componentes/reportes/TablaDePagosRealizados.vue';
import TarjetaDePagoRealizado from '../componentes/reportes/TarjetaDePagoRealizado.vue';
import TotalesDePagosPorForma from '../componentes/reportes/TotalesDePagosPorForma.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import {
  FILAS_DE_PAGOS_POR_PAGINA,
  lineasDeImpresionDePagos,
  totalesDePagos,
  totalesVigentesPorForma,
} from '../composables/reportes/pagos-realizados';
import { usarPagosRealizados } from '../composables/reportes/usar-pagos-realizados';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.pagosRealizados;
const r = usarPagosRealizados();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDePagos(r.filtros, nombreDelProveedor.value));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte recurso="reportes-de-pagos" @exportar="r.exportar" @imprimir="r.imprimir" />
    </EncabezadoPagina>
    <p v-if="r.avisoDeImpresion.value" class="text-sm text-tierra-600 print:hidden dark:text-tierra-300" role="status">
      {{ r.avisoDeImpresion.value }}
    </p>
    <FiltrosDePagosRealizados
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :error-del-rango="r.errorDelRango.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <TotalesDelReporte :totales="totalesDePagos(r.reporte.value)" titulo="Totales de todo lo filtrado" />
      <TotalesDePagosPorForma :totales="totalesVigentesPorForma(r.reporte.value)" />
      <EstadoVacio
        v-if="r.reporte.value.filas.length === 0"
        :icono="Banknote"
        titulo="No hay pagos con estos filtros"
        descripcion="Amplíe el rango de fechas o quite los filtros para ver más pagos."
      >
        <BotonBase variante="secundario" @click="r.quitarFiltros">Quitar filtros</BotonBase>
      </EstadoVacio>
      <div
        v-else
        :class="[{ 'print:hidden': r.impresas.value }, { 'opacity-60': r.cargando.value }]"
        :aria-busy="r.cargando.value"
      >
        <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
          <li v-for="fila in r.reporte.value.filas" :key="`${fila.pagoId}-${fila.documentoId}`">
            <TarjetaDePagoRealizado :fila="fila" />
          </li>
        </ul>
        <div class="hidden lg:block print:block"><TablaDePagosRealizados :filas="r.reporte.value.filas" /></div>
        <PaginacionDeLista
          v-model="r.pagina.value"
          :paginas="r.paginas.value"
          :limite="FILAS_DE_PAGOS_POR_PAGINA"
          :total="r.total.value"
          class="print:hidden"
        />
      </div>
      <div v-if="r.impresas.value" class="hidden print:block">
        <TablaDePagosRealizados :filas="r.impresas.value" />
      </div>
      <LeyendasDelReporte :avisos="[]" :leyendas="r.reporte.value.leyendas" />
    </template>
  </div>
</template>
