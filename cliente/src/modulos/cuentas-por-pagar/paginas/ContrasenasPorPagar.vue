<script setup lang="ts">
import { computed } from 'vue';
import { CalendarClock } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeContrasenasPorPagar from '../componentes/reportes/FiltrosDeContrasenasPorPagar.vue';
import TablaDeContrasenasPorPagar from '../componentes/reportes/TablaDeContrasenasPorPagar.vue';
import TarjetaDeContrasenaPorPagar from '../componentes/reportes/TarjetaDeContrasenaPorPagar.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import { lineasDeImpresionDeContrasenas, totalesDeContrasenas } from '../composables/reportes/contrasenas-por-pagar';
import { usarContrasenasPorPagar } from '../composables/reportes/usar-contrasenas-por-pagar';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.contrasenasPorPagar;
const r = usarContrasenasPorPagar();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeContrasenas(r.filtros, nombreDelProveedor.value));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeContrasenasPorPagar
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :error-de-la-fecha="r.errorDeLaFecha.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeContrasenas(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="r.reporte.value.filas.length === 0"
          :icono="CalendarClock"
          titulo="Ninguna contraseña con pago vencido"
          :descripcion="`No hay contraseñas con saldo y pago prometido hasta el ${formatearFecha(r.reporte.value.pagoPrometidoHasta)}. Amplíe la fecha para ver también las que vencen pronto.`"
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <template v-else>
          <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
            <li v-for="fila in r.reporte.value.filas" :key="fila.id"><TarjetaDeContrasenaPorPagar :fila="fila" /></li>
          </ul>
          <div class="hidden lg:block print:block"><TablaDeContrasenasPorPagar :filas="r.reporte.value.filas" /></div>
        </template>
      </div>
    </template>
  </div>
</template>
