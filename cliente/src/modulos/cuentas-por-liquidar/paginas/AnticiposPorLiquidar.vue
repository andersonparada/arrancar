<script setup lang="ts">
import { computed } from 'vue';
import { HandCoins } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import BloqueDeBeneficiario from '../componentes/reportes/BloqueDeBeneficiario.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeAnticiposPorLiquidar from '../componentes/reportes/FiltrosDeAnticiposPorLiquidar.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import TramosDeAntiguedad from '../componentes/reportes/TramosDeAntiguedad.vue';
import { lineasDeImpresionDeAnticipos } from '../composables/reportes/anticipos-por-liquidar';
import { totalesDeAnticiposPorLiquidar } from '../composables/reportes/resumen-de-reportes';
import { usarAnticiposPorLiquidar } from '../composables/reportes/usar-anticipos-por-liquidar';
import { VENTANAS_CUENTAS_POR_LIQUIDAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_LIQUIDAR.anticiposPorLiquidar;
const r = usarAnticiposPorLiquidar();
const lineas = computed(() => lineasDeImpresionDeAnticipos(r.filtros));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeAnticiposPorLiquidar
      v-model="r.filtros"
      :error-del-corte="r.errorDelCorte.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeAnticiposPorLiquidar(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.beneficiarios.length === 0"
          :icono="HandCoins"
          titulo="No hay anticipos por liquidar"
          descripcion="Nadie tenía anticipos sin justificar a esa fecha. Pruebe con otra fecha de corte."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <TramosDeAntiguedad :tramos="r.reporte.value.porTramo" />
          <div class="space-y-3">
            <BloqueDeBeneficiario
              v-for="b in r.reporte.value.beneficiarios"
              :key="b.beneficiarioId"
              :beneficiario="b"
            />
          </div>
        </template>
        <LeyendasDelReporte :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
