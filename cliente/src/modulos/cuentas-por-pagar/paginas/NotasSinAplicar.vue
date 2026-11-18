<script setup lang="ts">
import { computed } from 'vue';
import { FileMinus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeNotasSinAplicar from '../componentes/reportes/FiltrosDeNotasSinAplicar.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TablaDeNotasSinAplicar from '../componentes/reportes/TablaDeNotasSinAplicar.vue';
import TarjetaDeNotaSinAplicar from '../componentes/reportes/TarjetaDeNotaSinAplicar.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeNotas, totalesDeNotas } from '../composables/reportes/notas-sin-aplicar';
import { usarNotasSinAplicar } from '../composables/reportes/usar-notas-sin-aplicar';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.notasSinAplicar;
const r = usarNotasSinAplicar();
const lineas = computed(() => lineasDeImpresionDeNotas(r.filtros, r.nombreDeLaCuenta.value));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte recurso="reportes-de-pagos" @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeNotasSinAplicar
      v-model="r.filtros"
      :cuentas="r.opcionesDeCuenta.value"
      :error-del-corte="r.errorDelCorte.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeNotas(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.filas.length === 0"
          :icono="FileMinus"
          titulo="No hay notas de débito por aplicar"
          descripcion="Ninguna nota marcada para proveedores tenía saldo sin aplicar a esa fecha. Pruebe con otra fecha de corte."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
            <li v-for="fila in r.reporte.value.filas" :key="fila.movimientoId">
              <TarjetaDeNotaSinAplicar :fila="fila" />
            </li>
          </ul>
          <div class="hidden lg:block print:block"><TablaDeNotasSinAplicar :filas="r.reporte.value.filas" /></div>
        </template>
        <LeyendasDelReporte :avisos="[]" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
