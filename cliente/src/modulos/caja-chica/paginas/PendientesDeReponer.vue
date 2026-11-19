<script setup lang="ts">
import { computed } from 'vue';
import { ListChecks } from 'lucide-vue-next';
import BloqueDeComprobantes from '../componentes/reportes/BloqueDeComprobantes.vue';
import FiltrosAlCorte from '../componentes/reportes/FiltrosAlCorte.vue';
import MarcoDeReporte from '../componentes/reportes/MarcoDeReporte.vue';
import { lineasDeImpresionAlCorte } from '../composables/reportes/filtros-de-reportes';
import { totalesDePendientes } from '../composables/reportes/resumen-de-reportes';
import { usarPendientesDeReponer } from '../composables/reportes/usar-reportes-de-caja-chica';
import { VENTANAS_CAJA_CHICA } from '../textos';

const ventana = VENTANAS_CAJA_CHICA.pendientesDeReponer;
const r = usarPendientesDeReponer();
const lineas = computed(() => lineasDeImpresionAlCorte(r.filtros, r.nombreDelFondo.value));
const reporte = computed(() => r.reporte.value);
const imprimir = (): void => window.print();
</script>

<template>
  <MarcoDeReporte
    :titulo="ventana.titulo"
    :descripcion="ventana.descripcion"
    :lineas-de-impresion="lineas"
    :totales="reporte ? totalesDePendientes(reporte) : []"
    :leyendas="reporte?.leyendas ?? []"
    :cargando="r.cargando.value"
    :listo="reporte !== null"
    :vacio="reporte?.total.cantidad === 0"
    :cantidad-de-filtros="r.cantidadDeFiltros.value"
    :icono-vacio="ListChecks"
    titulo-vacio="No hay nada pendiente de reponer"
    descripcion-vacia="Todo lo gastado ya estaba repuesto a esa fecha. Pruebe con otra fecha de corte."
    @exportar="r.exportar"
    @imprimir="imprimir"
    @quitar="r.quitarFiltros"
  >
    <template #filtros>
      <FiltrosAlCorte
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
