<script setup lang="ts">
import { Landmark } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import AvisoDeImportacionDeApertura from '../componentes/saldos-iniciales/AvisoDeImportacionDeApertura.vue';
import EstadoDeLaApertura from '../componentes/saldos-iniciales/EstadoDeLaApertura.vue';
import HallazgosDeLaApertura from '../componentes/saldos-iniciales/HallazgosDeLaApertura.vue';
import TarjetaDeSaldoInicial from '../componentes/saldos-iniciales/TarjetaDeSaldoInicial.vue';
import TotalesDeLaApertura from '../componentes/saldos-iniciales/TotalesDeLaApertura.vue';
import { textoDeLaFechaDeCorte } from '../composables/saldos-iniciales/detalles-de-saldos-iniciales';
import { usarSaldosIniciales } from '../composables/saldos-iniciales/usar-saldos-iniciales';
import { VENTANAS_BANCOS } from '../textos';
import { NOTAS_DE_IMPORTAR_SALDOS, notasDeImportarPartidas } from '../textos-de-apertura';

const ventana = VENTANAS_BANCOS.saldosIniciales;
const pantalla = usarSaldosIniciales();
const { saldos, intercambio, intercambioDePartidas } = pantalla;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="pantalla.permisosDelExcel.value"
        nombre="saldos iniciales"
        @exportar="intercambio.exportar()"
        @importar="intercambio.abrir"
      />
      <AccionesDeIntercambio
        :permisos="pantalla.permisosDelExcel.value"
        nombre="partidas de apertura"
        @exportar="intercambioDePartidas.exportar()"
        @importar="intercambioDePartidas.abrir"
      />
    </EncabezadoPagina>

    <p v-if="pantalla.cargando.value" class="text-sm text-tierra-500">Cargando…</p>
    <template v-else-if="saldos">
      <EstadoDeLaApertura :saldos="saldos" />
      <HallazgosDeLaApertura :hallazgos="saldos.hallazgos" />
      <EstadoVacio
        v-if="!pantalla.cuentas.value.length"
        :icono="Landmark"
        titulo="Todavía no hay cuentas bancarias"
        descripcion="Cree las cuentas bancarias de la empresa y vuelva aquí para cargar su saldo inicial."
      />
      <template v-else>
        <TotalesDeLaApertura :total-bancos="saldos.totalBancos" :total-sobregiros="saldos.totalSobregiros" />
        <ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <li v-for="cuenta in pantalla.cuentas.value" :key="cuenta.cuentaBancariaId">
            <TarjetaDeSaldoInicial :cuenta="cuenta" />
          </li>
        </ul>
      </template>
    </template>

    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar saldos iniciales"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    >
      <template #aviso><AvisoDeImportacionDeApertura :notas="NOTAS_DE_IMPORTAR_SALDOS" /></template>
    </VentanaDeImportacion>
    <VentanaDeImportacion
      :estado="intercambioDePartidas.estado"
      titulo="Importar partidas de apertura"
      @elegir="intercambioDePartidas.elegir"
      @plantilla="intercambioDePartidas.bajarPlantilla"
      @importar="intercambioDePartidas.importar"
      @cerrar="intercambioDePartidas.cerrar"
    >
      <template #aviso>
        <AvisoDeImportacionDeApertura
          :notas="notasDeImportarPartidas(textoDeLaFechaDeCorte(saldos?.fechaDeCorte ?? null))"
        />
      </template>
    </VentanaDeImportacion>
  </div>
</template>
