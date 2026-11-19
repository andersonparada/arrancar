<script setup lang="ts">
import { computed } from 'vue';
import { Landmark } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import FiltrosDeSaldosPorCuenta from '../componentes/saldos-por-cuenta/FiltrosDeSaldosPorCuenta.vue';
import TarjetaDeSaldoDeCuenta from '../componentes/saldos-por-cuenta/TarjetaDeSaldoDeCuenta.vue';
import TotalesDeSaldos from '../componentes/saldos-por-cuenta/TotalesDeSaldos.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { filtroDeLaConsulta } from '../composables/saldos-por-cuenta/filtros-de-saldos';
import { usarSaldosPorCuenta } from '../composables/saldos-por-cuenta/usar-saldos-por-cuenta';
import { apiSaldosPorCuenta } from '../servicios/saldos-por-cuenta.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.saldos-por-cuenta.exportar' };
const ventana = VENTANAS_BANCOS.saldosPorCuenta;
const sesion = usarSesion();
const { filtros, reporte, cargando, errorDeFecha } = usarSaldosPorCuenta();
const { filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeCuenta();
const intercambio = usarIntercambio(apiSaldosPorCuenta.intercambio, async () => {});
const sinCuentas = computed(() => !cargando.value && !reporte.value.cuentas.length);

const imprimir = (): void => window.print();
const exportar = (): Promise<void> => intercambio.exportar(filtroDeLaConsulta(filtros));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <FiltrosDeSaldosPorCuenta
      v-model="filtros"
      :opciones-de-cuenta="opcionesDeCuenta"
      :error-de-fecha="errorDeFecha"
      class="print:hidden"
    />

    <TarjetaBase class="hidden print:block print:shadow-none print:ring-0">
      <h2 class="text-lg font-semibold">Saldos por cuenta</h2>
      <p class="mt-1 text-sm">{{ formatearTexto(sesion.empresa?.nombre) }} — al {{ formatearFecha(filtros.fecha) }}</p>
      <p class="mt-1 text-xs">Documento interno, no sustituye el estado de cuenta del banco.</p>
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
    <EstadoVacio
      v-else-if="sinCuentas"
      :icono="Landmark"
      titulo="No hay cuentas para mostrar"
      descripcion="Cambie la cuenta o la fecha de corte; si la empresa no tiene cuentas bancarias, créelas en Cuentas bancarias."
    />
    <template v-else>
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <TarjetaDeSaldoDeCuenta v-for="cuenta in reporte.cuentas" :key="cuenta.cuentaBancariaId" :cuenta="cuenta" />
      </div>
      <TotalesDeSaldos :bancos="reporte.bancos" :sobregiros="reporte.sobregiros" :nota="reporte.nota" />
    </template>
  </div>
</template>
