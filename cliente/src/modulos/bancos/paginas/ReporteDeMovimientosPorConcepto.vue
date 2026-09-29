<script setup lang="ts">
import { computed } from 'vue';
import { Sigma } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import FiltrosPorConcepto from '../componentes/movimientos-por-concepto/FiltrosPorConcepto.vue';
import TablaPorConcepto from '../componentes/movimientos-por-concepto/TablaPorConcepto.vue';
import { usarCatalogoDeConceptos } from '../composables/conceptos/usar-catalogo-de-conceptos';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import {
  filtroDeLaConsulta,
  resumenDeConceptosElegidos,
} from '../composables/movimientos-por-concepto/filtros-por-concepto';
import { usarReportePorConcepto } from '../composables/movimientos-por-concepto/usar-reporte-por-concepto';
import { apiMovimientosPorConcepto } from '../servicios/movimientos-por-concepto.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.movimientos.exportar' };
const ventana = VENTANAS_BANCOS.movimientosPorConcepto;
const sesion = usarSesion();
const { filtros, reporte, cargando, errorDelRango, detalles, alternar } = usarReportePorConcepto();
const { filtroDeCuenta: opcionesDeCuenta, cuentasBancarias } = usarReferenciasDeCuenta();
const { conceptos } = usarCatalogoDeConceptos();
const opcionesDeConcepto = computed(() =>
  [...conceptos.value].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(({ id, nombre }) => ({ id, nombre })),
);
const intercambio = usarIntercambio(apiMovimientosPorConcepto.intercambio, async () => {});

const cuentaElegida = computed(
  () => cuentasBancarias.value.find((cuenta) => cuenta.id === filtros.cuentaBancariaId)?.nombre ?? 'Todas las cuentas',
);
const periodo = computed(() => `${formatearFecha(filtros.desde)} — ${formatearFecha(filtros.hasta)}`);

const imprimir = (): void => window.print();
const exportar = (): Promise<void> => intercambio.exportar(filtroDeLaConsulta(filtros));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <FiltrosPorConcepto
      v-model="filtros"
      :opciones-de-cuenta="opcionesDeCuenta"
      :opciones-de-concepto="opcionesDeConcepto"
      :error-del-rango="errorDelRango"
      class="print:hidden"
    />

    <TarjetaBase class="hidden print:block print:shadow-none print:ring-0">
      <h2 class="text-lg font-semibold">Movimientos por concepto</h2>
      <p class="mt-1 text-sm">
        {{ formatearTexto(sesion.empresa?.nombre) }} — {{ cuentaElegida }} — {{ periodo }} — Conceptos:
        {{ resumenDeConceptosElegidos(filtros.conceptoIds) }}
      </p>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <EstadoVacio
      v-else-if="!reporte.conceptos.length"
      :icono="Sigma"
      titulo="No hay movimientos con este filtro"
      descripcion="Ningún concepto tiene movimientos en ese rango. Prueba con otras fechas, otra cuenta o quita la selección de conceptos."
    />
    <TablaPorConcepto v-else :reporte="reporte" :detalles="detalles" @alternar="alternar" />
  </div>
</template>
