<script setup lang="ts">
import { computed } from 'vue';
import { ListOrdered } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import EncabezadoDeImpresion from '@/modulos/core/componentes/reportes/EncabezadoDeImpresion.vue';
import TotalesDelReporte from '@/modulos/core/componentes/reportes/TotalesDelReporte.vue';
import ConteoFisicoDelPapel from '../componentes/correlativos-de-cheques/ConteoFisicoDelPapel.vue';
import TablaDeCorrelativosDeCheques from '../componentes/correlativos-de-cheques/TablaDeCorrelativosDeCheques.vue';
import {
  lineasDelEncabezado,
  numerosSinRegistro,
  OPCIONES_DE_ESTADO,
  totalesDelResumen,
} from '../composables/correlativos-de-cheques/resumen-de-correlativos-de-cheques';
import { usarReporteDeCorrelativosDeCheques } from '../composables/correlativos-de-cheques/usar-reporte-de-correlativos-de-cheques';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.correlativosDeCheques;
const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.correlativos-de-cheques.exportar' };
const { filtros, reporte, cargando, opcionesDeCuenta, opcionesDeLaChequera, exportar } =
  usarReporteDeCorrelativosDeCheques();

const imprimir = (): void => window.print();
const lineas = computed(() => (reporte.value ? lineasDelEncabezado(reporte.value, filtros.estado) : []));
const sinRegistro = computed(() => (reporte.value ? numerosSinRegistro(reporte.value.cheques) : []));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase v-if="reporte" variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <TarjetaBase class="print:hidden">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CampoSelector
          v-model="filtros.cuentaBancariaId"
          etiqueta="Cuenta"
          :opciones="opcionesDeCuenta"
          texto-vacio="Elija una cuenta"
        />
        <CampoSelector
          v-model="filtros.chequeraId"
          etiqueta="Chequera"
          :opciones="opcionesDeLaChequera"
          :deshabilitado="!filtros.cuentaBancariaId"
        />
        <CampoSelector
          v-model="filtros.estado"
          etiqueta="Mostrar"
          :opciones="OPCIONES_DE_ESTADO"
          :deshabilitado="!filtros.chequeraId"
        />
      </div>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="!reporte"
      :icono="ListOrdered"
      titulo="Elija una cuenta y su chequera"
      descripcion="Verá todos los números de la chequera: emitidos, anulados, inutilizados y los que quedan disponibles, y podrá imprimirlo con el cuadro para contar el papel."
    />
    <template v-else>
      <EncabezadoDeImpresion :titulo="ventana.titulo" :lineas="lineas" />
      <p
        v-if="reporte.resumen.alerta"
        class="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        {{ reporte.resumen.alerta }}
        <template v-if="sinRegistro.length"> Revise los números: {{ sinRegistro.join(', ') }}.</template>
      </p>
      <TotalesDelReporte :totales="totalesDelResumen(reporte.resumen)" titulo="Resumen de la chequera" />
      <p v-if="reporte.chequera.etiqueta" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ reporte.chequera.etiqueta }}
      </p>
      <TablaDeCorrelativosDeCheques v-if="reporte.cheques.length" :cheques="reporte.cheques" />
      <p v-else class="text-sm text-tierra-600 dark:text-tierra-300">Ningún número cumple con ese estado.</p>
      <ConteoFisicoDelPapel
        :disponibles-segun-el-sistema="reporte.conteoFisico.disponiblesSegunElSistema"
        :nota="reporte.conteoFisico.nota"
      />
    </template>
  </div>
</template>
