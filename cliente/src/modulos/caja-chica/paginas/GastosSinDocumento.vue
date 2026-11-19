<script setup lang="ts">
import { computed } from 'vue';
import { FileX2 } from 'lucide-vue-next';
import BloqueDeComprobantes from '../componentes/reportes/BloqueDeComprobantes.vue';
import FiltrosDePeriodo from '../componentes/reportes/FiltrosDePeriodo.vue';
import MarcoDeReporte from '../componentes/reportes/MarcoDeReporte.vue';
import { lineasDeImpresionDePeriodo } from '../composables/reportes/filtros-de-reportes';
import { totalesSinDocumento } from '../composables/reportes/resumen-de-reportes';
import { usarGastosSinDocumento } from '../composables/reportes/usar-reportes-de-caja-chica';
import { VENTANAS_CAJA_CHICA } from '../textos';

const ventana = VENTANAS_CAJA_CHICA.gastosSinDocumento;
const r = usarGastosSinDocumento();
const lineas = computed(() => lineasDeImpresionDePeriodo(r.filtros, r.nombreDelFondo.value));
const reporte = computed(() => r.reporte.value);
const imprimir = (): void => window.print();
</script>

<template>
  <MarcoDeReporte
    :titulo="ventana.titulo"
    :descripcion="ventana.descripcion"
    :lineas-de-impresion="lineas"
    :totales="reporte ? totalesSinDocumento(reporte) : []"
    :leyendas="reporte?.leyendas ?? []"
    :cargando="r.cargando.value"
    :listo="reporte !== null"
    :vacio="reporte?.total.cantidad === 0"
    :cantidad-de-filtros="r.cantidadDeFiltros.value"
    :icono-vacio="FileX2"
    titulo-vacio="No hay gastos sin documento fiscal"
    descripcion-vacia="Todo lo gastado en ese período tiene su factura dentro del libro de compras. Pruebe con otras fechas."
    @exportar="r.exportar"
    @imprimir="imprimir"
    @quitar="r.quitarFiltros"
  >
    <template #filtros>
      <FiltrosDePeriodo
        v-model="r.filtros"
        :errores="r.errores.value"
        :cantidad="r.cantidadDeFiltros.value"
        :fondos="r.opcionesDeFondos.value"
        @quitar="r.quitarFiltros"
      />
    </template>
    <BloqueDeComprobantes v-for="grupo in reporte?.fondos" :key="grupo.fondoId" :grupo="grupo" />
  </MarcoDeReporte>
</template>
