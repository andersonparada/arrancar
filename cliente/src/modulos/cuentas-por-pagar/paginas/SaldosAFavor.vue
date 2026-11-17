<script setup lang="ts">
import { computed } from 'vue';
import { PiggyBank } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import BloqueDeSaldosAFavor from '../componentes/reportes/BloqueDeSaldosAFavor.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeSaldosAFavor from '../componentes/reportes/FiltrosDeSaldosAFavor.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeSaldosAFavor, totalesDeSaldosAFavor } from '../composables/reportes/saldos-a-favor';
import { usarSaldosAFavor } from '../composables/reportes/usar-saldos-a-favor';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.saldosAFavor;
const r = usarSaldosAFavor();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeSaldosAFavor(r.filtros, nombreDelProveedor.value));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeSaldosAFavor
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
        <TotalesDelReporte :totales="totalesDeSaldosAFavor(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.filas.length === 0"
          :icono="PiggyBank"
          titulo="No hay saldos a favor"
          :descripcion="`Ninguna nota de crédito tiene saldo al ${formatearFecha(r.reporte.value.corte)} con estos filtros. Pruebe con otra fecha de corte o incluya las notas sin saldo.`"
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <BloqueDeSaldosAFavor
            v-if="r.grupos.value.vigentes.length"
            titulo="Dentro del plazo"
            descripcion="Notas con movimiento en los últimos cinco años."
            :filas="r.grupos.value.vigentes"
          />
          <BloqueDeSaldosAFavor
            v-if="r.grupos.value.prescritas.length"
            titulo="Posiblemente prescritas"
            descripcion="Ya pasó la fecha de posible prescripción. Consulte a su contador antes de darlas de baja."
            :filas="r.grupos.value.prescritas"
          />
        </template>
        <LeyendasDelReporte :avisos="r.reporte.value.avisos" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
