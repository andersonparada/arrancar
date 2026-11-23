<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaDeMotivo from '../componentes/compartido/VentanaDeMotivo.vue';
import BarraDeSeleccion from '../componentes/recepciones/BarraDeSeleccion.vue';
import PanelDeDescartadas from '../componentes/recepciones/PanelDeDescartadas.vue';
import TarjetaDeDocumentoPorRecibir from '../componentes/recepciones/TarjetaDeDocumentoPorRecibir.vue';
import VentanaDeDevolucion from '../componentes/recepciones/VentanaDeDevolucion.vue';
import VentanaDeRebaja from '../componentes/recepciones/VentanaDeRebaja.vue';
import VentanaDeRecepcion from '../componentes/recepciones/VentanaDeRecepcion.vue';
import { usarBandejaPorRecibir } from '../composables/recepciones/usar-bandeja-por-recibir';
import { AVISO_DE_DESCARTE, VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.porRecibir;
const { lista, recepcion, devolucion, rebaja, descarte } = usarBandejaPorRecibir();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />
    <PanelDeDescartadas :lineas="descarte.descartadas.value" @devolver="descarte.devolverALaBandeja" />

    <CampoTexto
      v-if="lista.hayLineas.value"
      v-model="lista.busqueda.value"
      etiqueta="Buscar"
      tipo="search"
      placeholder="Documento, proveedor o concepto"
      class="mb-4 max-w-md"
    />
    <p v-if="lista.cargando.value" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!lista.hayLineas.value"
      :icono="Inbox"
      titulo="No hay nada por recibir"
      descripcion="Las compras del Libro de compras marcadas como inventario aparecen aquí hasta que se reciben completas."
    />
    <EstadoVacio v-else-if="!lista.documentos.value.length" :icono="Inbox" titulo="Nada coincide con la búsqueda" />
    <ul v-else class="space-y-3">
      <li v-for="documento in lista.documentos.value" :key="documento.documentoId">
        <TarjetaDeDocumentoPorRecibir
          :documento="documento"
          :seleccion="lista.seleccion.value"
          @alternar="lista.alternar"
          @marcar-todo="(marcar) => lista.marcarDocumento(documento, marcar)"
          @descartar="descarte.abrir"
          @devolver="devolucion.abrir"
          @rebajar="rebaja.abrir"
        />
      </li>
    </ul>
    <BarraDeSeleccion
      :cantidad="lista.elegidas.value.length"
      @recibir="recepcion.abrir(lista.elegidas.value)"
      @quitar="lista.limpiarSeleccion"
    />

    <VentanaDeRecepcion
      v-model="recepcion.edicion.value"
      :catalogo="recepcion.catalogo"
      :aviso-de-referencias="recepcion.avisoDeReferencias.value"
      :opciones-de-bodegas="recepcion.opcionesDeBodegas.value"
      :errores="recepcion.errores.value"
      :enviando="recepcion.enviando.value"
      @cerrar="recepcion.edicion.value.abierta = false"
      @guardar="recepcion.guardar"
      @elegir-articulo="recepcion.alElegirArticulo"
      @dividir="recepcion.dividir"
      @quitar="recepcion.quitar"
    />
    <VentanaDeDevolucion
      v-model="devolucion.edicion.value"
      :errores="devolucion.errores.value"
      :enviando="devolucion.enviando.value"
      @cerrar="devolucion.edicion.value.abierta = false"
      @guardar="devolucion.guardar"
    />
    <VentanaDeRebaja
      v-model="rebaja.edicion.value"
      :errores="rebaja.errores.value"
      :enviando="rebaja.enviando.value"
      @cerrar="rebaja.edicion.value.abierta = false"
      @guardar="rebaja.guardar"
    />
    <VentanaDeMotivo
      v-model="descarte.edicion.value"
      titulo="Descartar la línea"
      :resumen="AVISO_DE_DESCARTE"
      texto-del-boton="Descartar"
      :enviando="descarte.enviando.value"
      :errores="descarte.errores.value"
      @cerrar="descarte.edicion.value.abierta = false"
      @guardar="descarte.guardar"
    />
  </div>
</template>
