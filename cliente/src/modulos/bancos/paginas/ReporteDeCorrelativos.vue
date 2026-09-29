<script setup lang="ts">
import { computed } from 'vue';
import { ListOrdered } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearTexto } from '@/modulos/core/utilidades/formato';
import TarjetaDeCorrelativo from '../componentes/correlativos/TarjetaDeCorrelativo.vue';
import { OPCIONES_DE_CLAVE, totalesDelReporte } from '../composables/correlativos/resumen-de-correlativos';
import {
  filtroDeLaConsulta,
  usarReporteDeCorrelativos,
} from '../composables/correlativos/usar-reporte-de-correlativos';
import { apiCorrelativos } from '../servicios/correlativos.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.movimientos.exportar' };
const ventana = VENTANAS_BANCOS.correlativos;
const sesion = usarSesion();
const { filtros, reporte, cargando } = usarReporteDeCorrelativos();
const intercambio = usarIntercambio(apiCorrelativos.intercambio, async () => {});

const totales = computed(() => totalesDelReporte(reporte.value.correlativos));
const claveElegida = computed(() => OPCIONES_DE_CLAVE.find((opcion) => opcion.valor === filtros.clave)?.texto);

const imprimir = (): void => window.print();
const exportar = (): Promise<void> => intercambio.exportar(filtroDeLaConsulta(filtros));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <TarjetaBase class="print:hidden">
      <div class="grid gap-3 sm:grid-cols-3">
        <CampoSelector v-model="filtros.clave" etiqueta="Correlativo" :opciones="OPCIONES_DE_CLAVE" />
      </div>
    </TarjetaBase>

    <TarjetaBase class="hidden print:block print:shadow-none print:ring-0">
      <h2 class="text-lg font-semibold">Reporte de correlativos</h2>
      <p class="mt-1 text-sm">{{ formatearTexto(sesion.empresa?.nombre) }} — {{ claveElegida }}</p>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <EstadoVacio
      v-else-if="!reporte.correlativos.length"
      :icono="ListOrdered"
      titulo="Aún no hay comprobantes numerados"
      descripcion="Cuando se registren notas o transferencias, aquí verás su numeración y los números que falten."
    />
    <template v-else>
      <p class="text-sm" :class="totales.alertas ? 'font-medium text-red-700 dark:text-red-400' : 'text-tierra-600'">
        {{ totales.huecos }} huecos en total; {{ totales.alertas }} sin auditoría.
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <TarjetaDeCorrelativo v-for="c in reporte.correlativos" :key="`${c.clave}-${c.anio}`" :correlativo="c" />
      </div>
    </template>
  </div>
</template>
