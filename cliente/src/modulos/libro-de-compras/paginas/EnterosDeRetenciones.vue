<script setup lang="ts">
import { reactive } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import MatrizDeEnteros from '../componentes/retenciones/MatrizDeEnteros.vue';
import NavegacionDeRetenciones from '../componentes/retenciones/NavegacionDeRetenciones.vue';
import VentanaDeMotivo from '../componentes/retenciones/VentanaDeMotivo.vue';
import VentanaDePagosDelMes from '../componentes/retenciones/VentanaDePagosDelMes.vue';
import VentanaDePago from '../componentes/retenciones/VentanaDePago.vue';
import { resumenDeAnularPago } from '../composables/retenciones/resumenes-de-acciones';
import { usarEnteros } from '../composables/retenciones/usar-enteros';
import { usarPendientesPorResolver } from '../composables/retenciones/usar-por-resolver';
import { VENTANA_DE_ENTEROS as textos } from '../textos-de-retenciones';

const enteros = usarEnteros();
const { anio, matriz, cargando, celdaAbierta } = enteros;
const pago = reactive(enteros.pago);
const anulacion = reactive(enteros.anulacion);
const pendientes = usarPendientesPorResolver();
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion" />
    <NavegacionDeRetenciones :pendientes="pendientes.cantidad.value" />

    <div class="mb-4 max-w-xs">
      <CampoSelector v-model="anio" :etiqueta="textos.anio" :opciones="enteros.opcionesDeAnio.value" />
    </div>
    <p v-if="cargando && !matriz" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <div v-else-if="matriz" :class="{ 'opacity-60': cargando }" :aria-busy="cargando">
      <MatrizDeEnteros :matriz="matriz" @abrir="enteros.abrirCelda" />
    </div>

    <VentanaDePagosDelMes
      :abierta="celdaAbierta !== null"
      :grupo="celdaAbierta"
      @registrar="celdaAbierta && pago.registrar(celdaAbierta)"
      @corregir="celdaAbierta && pago.corregir(celdaAbierta, $event)"
      @anular="anulacion.abrir($event)"
      @cerrar="enteros.cerrarCelda"
    />
    <VentanaDePago
      v-model="pago.pago"
      encima
      :abierta="pago.abierta"
      :grupo="pago.grupo"
      :corrigiendo="pago.corrigiendo !== null"
      :faltante="pago.faltante"
      :enviando="pago.enviando"
      :errores="pago.errores"
      @guardar="pago.guardar"
      @cerrar="pago.abierta = false"
    />
    <VentanaDeMotivo
      v-model="anulacion.motivo"
      encima
      :abierta="anulacion.abierta"
      :titulo="textos.anularTitulo"
      :resumen="resumenDeAnularPago(anulacion.objetivo)"
      :ayuda="textos.anularAyuda"
      :boton="textos.anular"
      :enviando="anulacion.enviando"
      :errores="anulacion.errores"
      @guardar="anulacion.guardar"
      @cerrar="anulacion.abierta = false"
    />
  </div>
</template>
