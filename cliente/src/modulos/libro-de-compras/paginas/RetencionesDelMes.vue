<script setup lang="ts">
import { HandCoins } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BarraDeSeleccion from '../componentes/retenciones/BarraDeSeleccion.vue';
import FiltrosDeRetenciones from '../componentes/retenciones/FiltrosDeRetenciones.vue';
import NavegacionDeRetenciones from '../componentes/retenciones/NavegacionDeRetenciones.vue';
import SalidasDeRetenciones from '../componentes/retenciones/SalidasDeRetenciones.vue';
import TablaDeRetenciones from '../componentes/retenciones/TablaDeRetenciones.vue';
import TarjetasDeGrupos from '../componentes/retenciones/TarjetasDeGrupos.vue';
import VentanaDeConstancias from '../componentes/retenciones/VentanaDeConstancias.vue';
import VentanaDeMotivo from '../componentes/retenciones/VentanaDeMotivo.vue';
import VentanaDePago from '../componentes/retenciones/VentanaDePago.vue';
import { resumenDeQuitarConstancia } from '../composables/retenciones/resumenes-de-acciones';
import { usarAccionesDelMes } from '../composables/retenciones/usar-acciones-del-mes';
import { usarPendientesPorResolver } from '../composables/retenciones/usar-por-resolver';
import { usarRetencionesDelMes } from '../composables/retenciones/usar-retenciones-del-mes';
import {
  VENTANA_DE_CONSTANCIAS as textosDeConstancias,
  VENTANA_DE_RETENCIONES as textos,
} from '../textos-de-retenciones';

const mes = usarRetencionesDelMes();
const { reporte, cargando, seleccion } = mes;
const pendientes = usarPendientesPorResolver();
const { constancias, pago, quitar } = usarAccionesDelMes(async () => {
  await Promise.all([mes.recargar(), pendientes.recargar()]);
});
const imprimir = () => window.print();
const puedeAnotar = usarSesion().puede('libro-de-compras.retenciones.constancias');
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion">
      <SalidasDeRetenciones :ocupado="mes.descargando.value" @exportar="mes.exportar" @imprimir="imprimir" />
    </EncabezadoPagina>
    <NavegacionDeRetenciones :pendientes="pendientes.cantidad.value" />
    <FiltrosDeRetenciones v-model="mes.filtros" :opciones-de-mes="mes.opcionesDeMes.value" />

    <p v-if="cargando && !reporte" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <div v-else-if="reporte" :class="{ 'opacity-60': cargando }" :aria-busy="cargando">
      <TarjetasDeGrupos :grupos="reporte.grupos" @pagar="pago.registrar" />
      <BarraDeSeleccion
        v-if="puedeAnotar && reporte.retenciones.length > 0"
        :marcadas="seleccion.marcadas.value.length"
        :total="seleccion.total.value"
        :posibles="seleccion.posibles.value.length"
        @anotar="constancias.abrir(seleccion.marcadas.value)"
        @marcar-posibles="seleccion.marcarPosibles"
        @limpiar="seleccion.limpiar"
      />
      <TablaDeRetenciones
        v-if="reporte.retenciones.length > 0"
        :retenciones="reporte.retenciones"
        titulo="Retenciones del mes"
        :seleccionable="puedeAnotar"
        :marcadas="seleccion.ids.value"
        :posibles="seleccion.posibles.value"
        :todas="seleccion.todas.value"
        @alternar="seleccion.alternar"
        @alternar-todas="seleccion.todas.value ? seleccion.limpiar() : seleccion.marcarPosibles()"
        @anotar="constancias.abrir([$event])"
        @quitar="quitar.abrir"
      />
      <EstadoVacio
        v-else-if="reporte.anuladas.length === 0"
        :icono="HandCoins"
        :titulo="textos.vacio"
        :descripcion="textos.vacioAyuda"
      />
      <section v-if="reporte.anuladas.length > 0" class="mt-8">
        <h2 class="text-base font-semibold">{{ textos.anuladas }}</h2>
        <p class="mb-2 text-sm text-tierra-600 dark:text-tierra-300">{{ textos.anuladasAyuda }}</p>
        <TablaDeRetenciones
          :retenciones="reporte.anuladas"
          :titulo="textos.anuladas"
          :seleccionable="false"
          :marcadas="[]"
          :posibles="[]"
          :todas="false"
          @anotar="constancias.abrir([$event])"
          @quitar="quitar.abrir"
        />
      </section>
    </div>

    <VentanaDeConstancias
      v-model:filas="constancias.filas"
      v-model:fecha="constancias.fechaParaTodas"
      :abierta="constancias.abierta"
      :enviando="constancias.enviando"
      :errores="constancias.errores"
      @copiar-fecha="constancias.copiarFecha"
      @guardar="constancias.guardar"
      @cerrar="constancias.abierta = false"
    />
    <VentanaDeMotivo
      v-model="quitar.motivo"
      :abierta="quitar.abierta"
      :titulo="textosDeConstancias.quitarTitulo"
      :resumen="resumenDeQuitarConstancia(quitar.objetivo)"
      :ayuda="textosDeConstancias.quitarAyuda"
      :boton="textosDeConstancias.quitar"
      :enviando="quitar.enviando"
      :errores="quitar.errores"
      @guardar="quitar.guardar"
      @cerrar="quitar.abierta = false"
    />
    <VentanaDePago
      v-model="pago.pago"
      :abierta="pago.abierta"
      :grupo="pago.grupo"
      :corrigiendo="pago.corrigiendo !== null"
      :faltante="pago.faltante"
      :enviando="pago.enviando"
      :errores="pago.errores"
      @guardar="pago.guardar"
      @cerrar="pago.abierta = false"
    />
  </div>
</template>
