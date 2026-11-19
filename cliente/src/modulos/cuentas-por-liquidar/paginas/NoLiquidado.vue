<script setup lang="ts">
import { computed } from 'vue';
import { Scale } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import BloqueDeDestino from '../componentes/reportes/BloqueDeDestino.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeNoLiquidado from '../componentes/reportes/FiltrosDeNoLiquidado.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeNoLiquidado } from '../composables/reportes/no-liquidado';
import { totalesDeNoLiquidado } from '../composables/reportes/resumen-de-reportes';
import { usarNoLiquidado } from '../composables/reportes/usar-no-liquidado';
import { VENTANAS_CUENTAS_POR_LIQUIDAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_LIQUIDAR.noLiquidado;
const r = usarNoLiquidado();
const lineas = computed(() => lineasDeImpresionDeNoLiquidado(r.filtros));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeNoLiquidado
      v-model="r.filtros"
      :errores="r.errores.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeNoLiquidado(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.total.cantidad === 0"
          :icono="Scale"
          titulo="No se dejó nada sin liquidar"
          descripcion="Ningún anticipo se liquidó con una parte sin justificar en ese período. Pruebe con otras fechas."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <div v-else class="space-y-3">
          <BloqueDeDestino v-for="grupo in r.reporte.value.grupos" :key="grupo.destino" :grupo="grupo" />
        </div>
        <LeyendasDelReporte :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
