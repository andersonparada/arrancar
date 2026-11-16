<script setup lang="ts">
import { computed } from 'vue';
import { ReceiptText } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeDocumentosAlCorte from '../componentes/reportes/FiltrosDeDocumentosAlCorte.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TablaDeDocumentosAlCorte from '../componentes/reportes/TablaDeDocumentosAlCorte.vue';
import TarjetaDeDocumentoAlCorte from '../componentes/reportes/TarjetaDeDocumentoAlCorte.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import { totalesDeDocumentos } from '../composables/reportes/resumen-de-reportes';
import { usarReporteDeDocumentos } from '../composables/reportes/usar-reporte-de-documentos';
import { FILAS_POR_PAGINA, lineasDeImpresionDeDocumentos } from '../composables/reportes/vistas-de-documentos';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.documentosAUnaFecha;
const r = usarReporteDeDocumentos();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeDocumentos(r.filtros, nombreDelProveedor.value));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="r.exportar" @imprimir="r.imprimir" />
    </EncabezadoPagina>
    <p v-if="r.avisoDeImpresion.value" class="text-sm text-tierra-600 print:hidden dark:text-tierra-300" role="status">
      {{ r.avisoDeImpresion.value }}
    </p>
    <FiltrosDeDocumentosAlCorte
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :error-del-corte="r.errorDelCorte.value"
      :cantidad="r.cantidadDeFiltros.value"
      @cambiar-vista="r.cambiarVista"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <TotalesDelReporte :totales="totalesDeDocumentos(r.reporte.value)" titulo="Totales de todo lo filtrado" />
      <EstadoVacio
        v-if="r.reporte.value.filas.length === 0"
        :icono="ReceiptText"
        titulo="No hay documentos con estos filtros"
        descripcion="Pruebe con otra vista o fecha de corte, o quite los filtros."
      >
        <BotonBase variante="secundario" @click="r.quitarFiltros">Quitar filtros</BotonBase>
      </EstadoVacio>
      <div
        v-else
        :class="[{ 'print:hidden': r.impresas.value }, { 'opacity-60': r.cargando.value }]"
        :aria-busy="r.cargando.value"
      >
        <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
          <li v-for="fila in r.reporte.value.filas" :key="fila.id"><TarjetaDeDocumentoAlCorte :fila="fila" /></li>
        </ul>
        <div class="hidden lg:block print:block">
          <TablaDeDocumentosAlCorte :filas="r.reporte.value.filas" :totales="r.reporte.value.totales" />
        </div>
        <PaginacionDeLista
          v-model="r.pagina.value"
          :paginas="r.paginas.value"
          :limite="FILAS_POR_PAGINA"
          :total="r.total.value"
          class="print:hidden"
        />
      </div>
      <div v-if="r.impresas.value" class="hidden print:block">
        <TablaDeDocumentosAlCorte :filas="r.impresas.value" :totales="r.reporte.value.totales" />
      </div>
      <LeyendasDelReporte :avisos="r.reporte.value.avisos" :leyendas="r.reporte.value.leyendas" />
    </template>
  </div>
</template>
