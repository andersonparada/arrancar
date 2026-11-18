<script setup lang="ts">
import { computed } from 'vue';
import { CalendarClock } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeChequesPosfechados from '../componentes/reportes/FiltrosDeChequesPosfechados.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TablaDeChequesPosfechados from '../componentes/reportes/TablaDeChequesPosfechados.vue';
import TarjetaDeChequePosfechado from '../componentes/reportes/TarjetaDeChequePosfechado.vue';
import TotalesDeChequesPorCuentaYSemana from '../componentes/reportes/TotalesDeChequesPorCuentaYSemana.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeCheques, totalesDeCheques } from '../composables/reportes/cheques-posfechados';
import { usarChequesPosfechados } from '../composables/reportes/usar-cheques-posfechados';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.chequesPosfechados;
const r = usarChequesPosfechados();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeCheques(r.filtros, nombreDelProveedor.value));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte recurso="reportes-de-pagos" @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeChequesPosfechados
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
        <TotalesDelReporte :totales="totalesDeCheques(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.filas.length === 0"
          :icono="CalendarClock"
          titulo="No hay cheques posfechados a esa fecha"
          descripcion="Ningún cheque entregado tiene fecha posterior al corte. Pruebe con otra fecha de corte."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <TotalesDeChequesPorCuentaYSemana :reporte="r.reporte.value" />
          <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
            <li v-for="fila in r.reporte.value.filas" :key="fila.pagoId">
              <TarjetaDeChequePosfechado :fila="fila" />
            </li>
          </ul>
          <div class="hidden lg:block print:block"><TablaDeChequesPosfechados :filas="r.reporte.value.filas" /></div>
        </template>
        <LeyendasDelReporte :avisos="[]" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
