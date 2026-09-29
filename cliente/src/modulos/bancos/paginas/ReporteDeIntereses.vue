<script setup lang="ts">
import { computed } from 'vue';
import { Percent } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import FiltrosDelFlujo from '../componentes/flujo-de-efectivo/FiltrosDelFlujo.vue';
import TablaDeIntereses from '../componentes/intereses/TablaDeIntereses.vue';
import TotalesDeIntereses from '../componentes/intereses/TotalesDeIntereses.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { filtroDeLaConsulta } from '../composables/flujo-de-efectivo/filtros-del-flujo';
import { usarReporteDeIntereses } from '../composables/intereses/usar-reporte-de-intereses';
import { apiIntereses } from '../servicios/intereses.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.intereses.exportar' };
const ventana = VENTANAS_BANCOS.intereses;
const sesion = usarSesion();
const { filtros, reporte, cargando, errorDelRango } = usarReporteDeIntereses();
const { filtroDeCuenta: opcionesDeCuenta, cuentasBancarias } = usarReferenciasDeCuenta();
const intercambio = usarIntercambio(apiIntereses.intercambio, async () => {});

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
      <h2 class="text-lg font-semibold">Intereses y retenciones de ISR</h2>
      <p class="mt-1 text-sm">{{ formatearTexto(sesion.empresa?.nombre) }} — {{ cuentaElegida }} — {{ periodo }}</p>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <template v-else>
      <TotalesDeIntereses :reporte="reporte" />
      <EstadoVacio
        v-if="!reporte.intereses.length"
        :icono="Percent"
        titulo="No hay intereses en este período"
        descripcion="Las notas de crédito con un concepto de intereses y su ISR retenido aparecen aquí. Prueba con otro rango o con otra cuenta."
      />
      <TablaDeIntereses v-else :intereses="reporte.intereses" />
    </template>
  </div>
</template>
