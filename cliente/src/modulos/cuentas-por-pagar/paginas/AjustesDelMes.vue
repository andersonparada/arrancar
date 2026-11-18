<script setup lang="ts">
import { computed } from 'vue';
import { ClipboardCheck } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeAjustesDelMes from '../componentes/reportes/FiltrosDeAjustesDelMes.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import SeccionesDeAjustesDelMes from '../componentes/reportes/SeccionesDeAjustesDelMes.vue';
import TotalesDeAjustesPorCausa from '../componentes/reportes/TotalesDeAjustesPorCausa.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import {
  cantidadDeFilasDeAjustes,
  lineasDeImpresionDeAjustes,
  textoDeMes,
  totalesDeAjustes,
  totalesPorCausaYEfecto,
} from '../composables/reportes/ajustes-del-mes';
import { usarAjustesDelMes } from '../composables/reportes/usar-ajustes-del-mes';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.ajustesDelMes;
const r = usarAjustesDelMes();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeAjustes(r.filtros, nombreDelProveedor.value));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte recurso="reportes-de-control" @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeAjustesDelMes
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :meses="r.meses"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte
          :totales="totalesDeAjustes(r.reporte.value)"
          :titulo="`Totales de ${textoDeMes(r.reporte.value.mes)}`"
        />
        <TotalesDeAjustesPorCausa :filas="totalesPorCausaYEfecto(r.reporte.value)" />
        <EstadoVacio
          v-if="cantidadDeFilasDeAjustes(r.reporte.value) === 0"
          :icono="ClipboardCheck"
          :titulo="`Sin cambios que revisar en ${textoDeMes(r.reporte.value.mes)}`"
          descripcion="No hubo ajustes, compensaciones, pagos a la apertura ni documentos revertidos con estos filtros."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <SeccionesDeAjustesDelMes v-else :reporte="r.reporte.value" />
        <LeyendasDelReporte :avisos="[]" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
