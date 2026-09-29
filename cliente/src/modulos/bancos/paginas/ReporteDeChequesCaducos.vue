<script setup lang="ts">
import { computed } from 'vue';
import { Hourglass } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearTexto } from '@/modulos/core/utilidades/formato';
import FiltrosDeChequesCaducos from '../componentes/cheques-caducos/FiltrosDeChequesCaducos.vue';
import ResumenDeChequesCaducos from '../componentes/cheques-caducos/ResumenDeChequesCaducos.vue';
import TablaDeChequesCaducos from '../componentes/cheques-caducos/TablaDeChequesCaducos.vue';
import { filtroDeLaConsulta } from '../composables/cheques-caducos/filtros-de-cheques-caducos';
import { usarReporteDeChequesCaducos } from '../composables/cheques-caducos/usar-reporte-de-cheques-caducos';
import { apiChequesCaducos } from '../servicios/cheques-caducos.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.cheques-caducos.exportar' };
const ventana = VENTANAS_BANCOS.chequesCaducos;
const sesion = usarSesion();
const { filtros, reporte, cargando, opcionesDeCuenta, mesesDeLaEmpresa } = usarReporteDeChequesCaducos();
const intercambio = usarIntercambio(apiChequesCaducos.intercambio, async () => {});

const cuentaElegida = computed(() => opcionesDeCuenta.value.find((o) => o.valor === filtros.cuentaBancariaId)?.texto);
const imprimir = (): void => window.print();
const exportar = (): Promise<void> => intercambio.exportar(filtroDeLaConsulta(filtros));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <FiltrosDeChequesCaducos
      v-model="filtros"
      :opciones-de-cuenta="opcionesDeCuenta"
      :meses-de-la-empresa="mesesDeLaEmpresa"
      class="print:hidden"
    />

    <TarjetaBase class="hidden print:block print:shadow-none print:ring-0">
      <h2 class="text-lg font-semibold">Cheques caducos</h2>
      <p class="mt-1 text-sm">
        {{ formatearTexto(sesion.empresa?.nombre) }} — {{ cuentaElegida ?? 'Todas las cuentas' }}
        {{ filtros.beneficiario ? `— Beneficiario: ${filtros.beneficiario}` : '' }}
      </p>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <EstadoVacio
      v-else-if="!reporte.cheques.length"
      :icono="Hourglass"
      titulo="No hay cheques caducos"
      descripcion="Ningún cheque emitido y sin cobrar pasa del plazo con este filtro. Prueba con menos meses o con otra cuenta."
    />
    <template v-else>
      <ResumenDeChequesCaducos :reporte="reporte" />
      <TablaDeChequesCaducos :cheques="reporte.cheques" />
    </template>
  </div>
</template>
