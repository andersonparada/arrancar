<script setup lang="ts">
import { computed } from 'vue';
import { HandCoins } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeRetirosPorLiquidar from '../componentes/reportes/FiltrosDeRetirosPorLiquidar.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TablaDeRetirosPorLiquidar from '../componentes/reportes/TablaDeRetirosPorLiquidar.vue';
import TarjetaDeRetiroPorLiquidar from '../componentes/reportes/TarjetaDeRetiroPorLiquidar.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeRetiros, totalesDeRetiros } from '../composables/reportes/retiros-por-liquidar';
import { usarRetirosPorLiquidar } from '../composables/reportes/usar-retiros-por-liquidar';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.retirosPorLiquidar;
const r = usarRetirosPorLiquidar();
const lineas = computed(() => lineasDeImpresionDeRetiros(r.filtros));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte recurso="reportes-de-pagos" @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeRetirosPorLiquidar
      v-model="r.filtros"
      :error-del-corte="r.errorDelCorte.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeRetiros(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.filas.length === 0"
          :icono="HandCoins"
          titulo="No hay retiros de efectivo por liquidar"
          descripcion="Ningún custodio tenía efectivo sin liquidar a esa fecha. Pruebe con otra fecha de corte."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
            <li v-for="fila in r.reporte.value.filas" :key="fila.id"><TarjetaDeRetiroPorLiquidar :fila="fila" /></li>
          </ul>
          <div class="hidden lg:block print:block"><TablaDeRetirosPorLiquidar :filas="r.reporte.value.filas" /></div>
        </template>
        <LeyendasDelReporte :avisos="[]" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
