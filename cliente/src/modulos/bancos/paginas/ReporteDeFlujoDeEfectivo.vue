<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import ControlDeCuadre from '../componentes/flujo-de-efectivo/ControlDeCuadre.vue';
import FiltrosDelFlujo from '../componentes/flujo-de-efectivo/FiltrosDelFlujo.vue';
import LineasAparteDelFlujo from '../componentes/flujo-de-efectivo/LineasAparteDelFlujo.vue';
import SeccionDeActividad from '../componentes/flujo-de-efectivo/SeccionDeActividad.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { filtroDeLaConsulta } from '../composables/flujo-de-efectivo/filtros-del-flujo';
import { usarReporteDelFlujo } from '../composables/flujo-de-efectivo/usar-reporte-del-flujo';
import { apiFlujoDeEfectivo } from '../servicios/flujo-de-efectivo.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.flujo-de-efectivo.exportar' };
const ventana = VENTANAS_BANCOS.flujoDeEfectivo;
const sesion = usarSesion();
const { filtros, reporte, cargando, errorDelRango } = usarReporteDelFlujo();
const { filtroDeCuenta: opcionesDeCuenta, cuentasBancarias } = usarReferenciasDeCuenta();
const intercambio = usarIntercambio(apiFlujoDeEfectivo.intercambio, async () => {});

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

    <FiltrosDelFlujo
      v-model="filtros"
      :opciones-de-cuenta="opcionesDeCuenta"
      :error-del-rango="errorDelRango"
      class="print:hidden"
    />

    <TarjetaBase class="hidden print:block print:shadow-none print:ring-0">
      <h2 class="text-lg font-semibold">Flujo de efectivo (método directo)</h2>
      <p class="mt-1 text-sm">{{ formatearTexto(sesion.empresa?.nombre) }} — {{ cuentaElegida }} — {{ periodo }}</p>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <template v-else>
      <SeccionDeActividad v-for="actividad in reporte.actividades" :key="actividad.actividad" :actividad="actividad" />
      <LineasAparteDelFlujo v-if="reporte.lineasAparte.length" :lineas="reporte.lineasAparte" />
      <ControlDeCuadre :control="reporte.control" />
    </template>
  </div>
</template>
