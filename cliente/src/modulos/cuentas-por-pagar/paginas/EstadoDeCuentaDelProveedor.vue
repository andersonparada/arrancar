<script setup lang="ts">
import { computed } from 'vue';
import { ScrollText } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeEstadoDeCuenta from '../componentes/reportes/FiltrosDeEstadoDeCuenta.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import TablaDeEstadoDeCuenta from '../componentes/reportes/TablaDeEstadoDeCuenta.vue';
import TarjetaDeLineaDelEstado from '../componentes/reportes/TarjetaDeLineaDelEstado.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import {
  lineasDeImpresionDeEstado,
  textoSinMovimientos,
  totalesDeEstado,
} from '../composables/reportes/estado-de-cuenta';
import { usarEstadoDeCuenta } from '../composables/reportes/usar-estado-de-cuenta';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.estadoDeCuenta;
const r = usarEstadoDeCuenta();
const estado = computed(() => (r.filtros.proveedorId ? r.reporte.value : null));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte v-if="estado" @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeEstadoDeCuenta
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :error-del-rango="r.errorDelRango.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EstadoVacio
      v-if="!r.filtros.proveedorId"
      :icono="ScrollText"
      titulo="Elija un proveedor"
      descripcion="El estado de cuenta es de un solo proveedor. Elíjalo arriba y escoja el período."
    />
    <p v-else-if="!estado && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="estado">
      <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineasDeImpresionDeEstado(estado)" />
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeEstado(estado)" titulo="Totales del estado de cuenta" />
        <p v-if="estado.lineas.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300" role="status">
          {{ textoSinMovimientos(estado) }}
        </p>
        <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
          <li v-for="(linea, i) in estado.lineas" :key="i">
            <TarjetaDeLineaDelEstado :linea="linea" :interna="estado.presentacion === 'interna'" />
          </li>
        </ul>
        <div class="hidden lg:block print:block"><TablaDeEstadoDeCuenta :estado="estado" /></div>
        <LeyendasDelReporte :avisos="estado.avisos" :leyendas="estado.leyendas" />
      </div>
    </template>
  </div>
</template>
