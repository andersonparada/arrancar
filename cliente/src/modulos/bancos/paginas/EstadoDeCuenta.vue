<script setup lang="ts">
import { computed } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import EncabezadoDelEstado from '../componentes/estado-de-cuenta/EncabezadoDelEstado.vue';
import FiltrosDelEstadoDeCuenta from '../componentes/estado-de-cuenta/FiltrosDelEstadoDeCuenta.vue';
import TablaDelEstadoDeCuenta from '../componentes/estado-de-cuenta/TablaDelEstadoDeCuenta.vue';
import TotalesDelEstado from '../componentes/estado-de-cuenta/TotalesDelEstado.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { totalesDelEstado } from '../composables/estado-de-cuenta/totales-del-estado-de-cuenta';
import { usarEstadoDeCuenta } from '../composables/estado-de-cuenta/usar-estado-de-cuenta';
import { filtroDeLaConsulta } from '../composables/movimientos/filtros-de-movimientos';
import { apiMovimientos } from '../servicios/movimientos.api';
import { VENTANAS_BANCOS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { exportar: 'bancos.movimientos.exportar' };
const ventana = VENTANAS_BANCOS.estadoDeCuenta;
const sesion = usarSesion();
const { filtros, reporte, cargando, errorDelRango, listo } = usarEstadoDeCuenta();
const { cuentasBancarias } = usarReferenciasDeCuenta();
const intercambio = usarIntercambio(apiMovimientos.intercambio, async () => {});

const cuentasPorNombre = computed(() =>
  [...cuentasBancarias.value].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
);
const opcionesDeCuenta = computed(() => [
  { valor: null, texto: 'Elija una cuenta' },
  ...cuentasPorNombre.value.map((cuenta) => ({ valor: cuenta.id, texto: cuenta.nombre })),
]);
const cuenta = computed(() => cuentasBancarias.value.find((c) => c.id === filtros.cuentaBancariaId));
const totales = computed(() => totalesDelEstado(reporte.value.filas));

const imprimir = (): void => window.print();
const exportar = (): Promise<void> => intercambio.exportar(filtroDeLaConsulta(filtros));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" class="print:hidden">
      <AccionesDeIntercambio v-if="listo" :permisos="PERMISOS_DE_INTERCAMBIO" @exportar="exportar" />
      <BotonBase v-if="listo" variante="secundario" @click="imprimir">Imprimir</BotonBase>
    </EncabezadoPagina>

    <FiltrosDelEstadoDeCuenta
      v-model="filtros"
      :opciones-de-cuenta="opcionesDeCuenta"
      :error-del-rango="errorDelRango"
      class="print:hidden"
    />

    <EstadoVacio
      v-if="!filtros.cuentaBancariaId"
      :icono="FileSpreadsheet"
      titulo="Elija una cuenta"
      descripcion="El estado de cuenta es de una sola cuenta: elíjala arriba y ajuste el rango de fechas."
    />
    <template v-else-if="cuenta && listo">
      <EncabezadoDelEstado
        :empresa="sesion.empresa?.nombre ?? null"
        :banco="cuenta.bancoNombre"
        :cuenta="cuenta.nombre"
        :numero="cuenta.numero"
        :desde="filtros.desde"
        :hasta="filtros.hasta"
      />
      <p v-if="cargando" class="text-sm text-tierra-500 print:hidden">Cargando…</p>
      <template v-else>
        <TablaDelEstadoDeCuenta :reporte="reporte" />
        <TotalesDelEstado :totales="totales" />
      </template>
    </template>
  </div>
</template>
