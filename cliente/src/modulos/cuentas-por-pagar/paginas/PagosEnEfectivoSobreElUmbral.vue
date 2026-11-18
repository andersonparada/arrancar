<script setup lang="ts">
import { computed } from 'vue';
import { ShieldAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDelReporte from '../componentes/reportes/AccionesDelReporte.vue';
import EncabezadoDeImpresion from '../componentes/reportes/EncabezadoDeImpresion.vue';
import FiltrosDeBancarizacion from '../componentes/reportes/FiltrosDeBancarizacion.vue';
import LeyendasDelReporte from '../componentes/reportes/LeyendasDelReporte.vue';
import SeccionesDeBancarizacion from '../componentes/reportes/SeccionesDeBancarizacion.vue';
import TotalesDelReporte from '../componentes/reportes/TotalesDelReporte.vue';
import {
  lineasDeImpresionDeBancarizacion,
  reporteDeBancarizacionVacio,
  totalesDeBancarizacion,
} from '../composables/reportes/bancarizacion';
import { usarBancarizacion } from '../composables/reportes/usar-bancarizacion';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.bancarizacion;
const r = usarBancarizacion();
const nombreDelProveedor = computed(
  () => r.proveedores.value.find((p) => p.id === r.filtros.proveedorId)?.nombre ?? null,
);
const lineas = computed(() => lineasDeImpresionDeBancarizacion(r.filtros, nombreDelProveedor.value));
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDelReporte recurso="reportes-de-control" @exportar="r.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <FiltrosDeBancarizacion
      v-model="r.filtros"
      :proveedores="r.proveedores.value"
      :meses="r.meses"
      :error-del-rango="r.errorDelRango.value"
      :cantidad="r.cantidadDeFiltros.value"
      @quitar="r.quitarFiltros"
    />
    <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />

    <p v-if="!r.reporte.value && r.cargando.value" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <template v-else-if="r.reporte.value">
      <div :class="{ 'opacity-60': r.cargando.value }" :aria-busy="r.cargando.value" class="space-y-4">
        <TotalesDelReporte :totales="totalesDeBancarizacion(r.reporte.value)" titulo="Totales" />
        <EstadoVacio
          v-if="reporteDeBancarizacionVacio(r.reporte.value)"
          :icono="ShieldAlert"
          titulo="Sin pagos en efectivo sobre el umbral"
          descripcion="En estos meses ningún pago en efectivo puso en riesgo crédito fiscal ni costo. Pruebe con otro rango o quite «Solo con efecto fiscal»."
        >
          <BotonBase v-if="r.cantidadDeFiltros.value > 0" variante="secundario" @click="r.quitarFiltros">
            Quitar filtros
          </BotonBase>
        </EstadoVacio>
        <SeccionesDeBancarizacion v-else :reporte="r.reporte.value" />
        <LeyendasDelReporte :avisos="[]" :leyendas="r.reporte.value.leyendas" />
      </div>
    </template>
  </div>
</template>
