<script setup lang="ts">
import { computed } from 'vue';
import { RefreshCcw } from 'lucide-vue-next';
import BloqueDeReposiciones from '../componentes/reportes/BloqueDeReposiciones.vue';
import FiltrosDePeriodo from '../componentes/reportes/FiltrosDePeriodo.vue';
import MarcoDeReporte from '../componentes/reportes/MarcoDeReporte.vue';
import { lineasDeImpresionDePeriodo } from '../composables/reportes/filtros-de-reportes';
import { totalesDeReposiciones } from '../composables/reportes/resumen-de-reportes';
import { usarReposicionesDelPeriodo } from '../composables/reportes/usar-reportes-de-caja-chica';
import { VENTANAS_CAJA_CHICA } from '../textos';

const ventana = VENTANAS_CAJA_CHICA.reposicionesDelPeriodo;
const r = usarReposicionesDelPeriodo();
const lineas = computed(() => lineasDeImpresionDePeriodo(r.filtros, r.nombreDelFondo.value));
const reporte = computed(() => r.reporte.value);
const imprimir = (): void => window.print();
</script>

<template>
  <MarcoDeReporte
    :titulo="ventana.titulo"
    :descripcion="ventana.descripcion"
    :lineas-de-impresion="lineas"
    :totales="reporte ? totalesDeReposiciones(reporte) : []"
    :leyendas="reporte?.leyendas ?? []"
    :cargando="r.cargando.value"
    :listo="reporte !== null"
    :vacio="reporte?.total.cantidad === 0"
    :cantidad-de-filtros="r.cantidadDeFiltros.value"
    :icono-vacio="RefreshCcw"
    titulo-vacio="No hubo reposiciones"
    descripcion-vacia="Ningún fondo recibió una reposición vigente en ese período. Pruebe con otras fechas."
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
    <BloqueDeReposiciones v-for="fondo in reporte?.fondos" :key="fondo.fondoId" :fondo="fondo" />
  </MarcoDeReporte>
</template>
