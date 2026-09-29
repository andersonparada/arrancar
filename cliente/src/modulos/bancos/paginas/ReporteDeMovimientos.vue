<script setup lang="ts">
import { computed } from 'vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import FiltrosDeMovimientos from '../componentes/movimientos/FiltrosDeMovimientos.vue';
import ResumenDeSinClasificar from '../componentes/movimientos/ResumenDeSinClasificar.vue';
import TablaDelReporte from '../componentes/movimientos/TablaDelReporte.vue';
import { opcionesDeFiltroDeConcepto } from '../composables/conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../composables/conceptos/usar-catalogo-de-conceptos';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { filtroDeLaConsulta } from '../composables/movimientos/filtros-de-movimientos';
import { usarReporteDeMovimientos } from '../composables/movimientos/usar-reporte-de-movimientos';
import { apiMovimientos } from '../servicios/movimientos.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.movimientos.exportar' };
const ventana = VENTANAS_BANCOS.movimientos;
const sesion = usarSesion();
const { filtros, reporte, cargando } = usarReporteDeMovimientos();
const { filtroDeCuenta: opcionesDeCuenta, cuentasBancarias } = usarReferenciasDeCuenta();
const { conceptos } = usarCatalogoDeConceptos();
const opcionesDeConcepto = computed(() => opcionesDeFiltroDeConcepto(conceptos.value));
const intercambio = usarIntercambio(apiMovimientos.intercambio, async () => {});

/** Con un concepto elegido no hay saldo corrido: sería el de solo algunas filas. */
const conCuenta = computed(() => !!filtros.cuentaBancariaId && !filtros.conceptoId);
const nombreDelConcepto = computed(() => conceptos.value.find((c) => c.id === filtros.conceptoId)?.nombre ?? null);
const nombreDeLaCuenta = computed(
  () => cuentasBancarias.value.find((c) => c.id === filtros.cuentaBancariaId)?.nombre ?? null,
);
const rango = computed(() => `${formatearFecha(filtros.desde) || 'Siempre'} — ${formatearFecha(filtros.hasta)}`);

const imprimir = (): void => window.print();
const exportar = (): Promise<void> => intercambio.exportar(filtroDeLaConsulta(filtros));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <FiltrosDeMovimientos
      v-model="filtros"
      :opciones-de-cuenta="opcionesDeCuenta"
      :opciones-de-concepto="opcionesDeConcepto"
      class="print:hidden"
    />
    <ResumenDeSinClasificar :resumen="reporte.sinClasificar" />

    <TarjetaBase class="hidden print:block print:shadow-none print:ring-0">
      <h2 class="text-lg font-semibold">Reporte de movimientos</h2>
      <dl class="mt-2 grid grid-cols-4 gap-4 text-sm">
        <div>
          <dt class="text-xs text-tierra-500">Empresa</dt>
          <dd>{{ formatearTexto(sesion.empresa?.nombre) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Cuenta</dt>
          <dd>{{ formatearTexto(nombreDeLaCuenta) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Concepto</dt>
          <dd>{{ nombreDelConcepto ?? 'Todos' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Periodo</dt>
          <dd>{{ rango }}</dd>
        </div>
      </dl>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <TablaDelReporte v-else :reporte="reporte" :con-cuenta="conCuenta" />
  </div>
</template>
