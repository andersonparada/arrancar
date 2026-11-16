<script setup lang="ts">
import { FileCheck } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import EncabezadoDeImpresion from '@/modulos/core/componentes/reportes/EncabezadoDeImpresion.vue';
import TotalesDelReporte from '@/modulos/core/componentes/reportes/TotalesDelReporte.vue';
import { cifrasDePendientes, retenidoDeAnuladas } from '../composables/retenciones/datos-de-constancias-pendientes';
import { usarConstanciasPendientes } from '../composables/retenciones/usar-constancias-pendientes';
import EncabezadoDelBloquePendiente from '../componentes/retenciones/EncabezadoDelBloquePendiente.vue';
import EnlaceAPorPracticar from '../componentes/retenciones/EnlaceAPorPracticar.vue';
import FilasDeConstanciasPendientes from '../componentes/retenciones/FilasDeConstanciasPendientes.vue';
import FiltrosDeConstanciasPendientes from '../componentes/retenciones/FiltrosDeConstanciasPendientes.vue';
import NavegacionDeRetenciones from '../componentes/retenciones/NavegacionDeRetenciones.vue';
import SalidasDeRetenciones from '../componentes/retenciones/SalidasDeRetenciones.vue';
import { VENTANA_DE_CONSTANCIAS_PENDIENTES as textos } from '../textos-de-constancias-pendientes';
import { formatearMonto } from '@/modulos/core/utilidades/formato';

const r = usarConstanciasPendientes();
</script>

<template>
  <div class="min-w-0 space-y-4">
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion" class="print:hidden">
      <SalidasDeRetenciones :ocupado="r.descargando.value" @exportar="r.exportar" @imprimir="r.imprimir" />
    </EncabezadoPagina>
    <NavegacionDeRetenciones :pendientes="null" />
    <FiltrosDeConstanciasPendientes
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="textos.titulo" :lineas="r.lineas.value" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div class="space-y-4" :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value">
        <TotalesDelReporte :totales="cifrasDePendientes(r.reporte.value)" titulo="Resumen" />
        <EnlaceAPorPracticar v-if="r.puedeVerPorPracticar.value" />
        <EstadoVacio
          v-if="r.reporte.value.pendientes.length === 0"
          :icono="FileCheck"
          :titulo="textos.vacio"
          :descripcion="textos.vacioAyuda"
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <section
          v-for="bloque in r.bloques.value"
          :key="bloque.clave"
          class="space-y-2 break-inside-avoid"
          :aria-label="`${bloque.titulo}, ${bloque.nombreDelGrupo}`"
        >
          <EncabezadoDelBloquePendiente :bloque="bloque" />
          <FilasDeConstanciasPendientes :filas="bloque.filas" :titulo="`${bloque.titulo}, ${bloque.nombreDelGrupo}`" />
        </section>
        <section v-if="r.reporte.value.anuladas.length" class="space-y-2" aria-label="Anuladas">
          <h3 class="font-semibold">{{ textos.anuladas }}</h3>
          <p class="text-sm text-tierra-600 dark:text-tierra-300">
            {{ textos.anuladasAyuda }} Suman {{ formatearMonto(retenidoDeAnuladas(r.reporte.value.anuladas)) }} y no
            están en el total.
          </p>
          <FilasDeConstanciasPendientes :filas="r.reporte.value.anuladas" :titulo="textos.anuladas" />
        </section>
        <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ textos.leyenda }}</p>
      </div>
    </template>
  </div>
</template>
