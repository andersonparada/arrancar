<script setup lang="ts">
import { Inbox, SearchX } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AvisoDeSoftware from '../componentes/bandeja/AvisoDeSoftware.vue';
import BarraDeSeleccion from '../componentes/bandeja/BarraDeSeleccion.vue';
import DescartadasDeLaSesion from '../componentes/bandeja/DescartadasDeLaSesion.vue';
import FiltrosDeBandeja from '../componentes/bandeja/FiltrosDeBandeja.vue';
import GrupoDeDocumento from '../componentes/bandeja/GrupoDeDocumento.vue';
import VentanaDeCapitalizar from '../componentes/bandeja/VentanaDeCapitalizar.vue';
import VentanaDeMotivo from '../componentes/comunes/VentanaDeMotivo.vue';
import { usarBandeja } from '../composables/bandeja/usar-bandeja';
import { usarCapitalizacion } from '../composables/bandeja/usar-capitalizacion';
import { usarDescartes } from '../composables/bandeja/usar-descartes';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const ventana = VENTANAS_ACTIVOS_FIJOS.porCapitalizar;
const bandeja = usarBandeja();
const descartes = usarDescartes(bandeja.cargar);
const capitalizacion = usarCapitalizacion(bandeja.cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />
    <AvisoDeSoftware />
    <DescartadasDeLaSesion :lineas="descartes.descartadas" @devolver="descartes.devolver" />
    <FiltrosDeBandeja v-model="bandeja.filtros" v-model:texto="bandeja.texto" />

    <p v-if="bandeja.cargando && !bandeja.datos.lineas.length" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!bandeja.grupos.length"
      :icono="bandeja.hayFiltros ? SearchX : Inbox"
      :titulo="bandeja.hayFiltros ? 'Ninguna línea coincide con lo que buscó' : 'No hay líneas por capitalizar'"
      :descripcion="
        bandeja.hayFiltros
          ? 'Quite o cambie los filtros para ver las demás.'
          : 'Las compras marcadas como activo fijo en el libro de compras aparecen aquí hasta que las capitalice o las descarte.'
      "
    />
    <div v-else class="space-y-4">
      <GrupoDeDocumento
        v-for="grupo in bandeja.grupos"
        :key="grupo.documentoId"
        :grupo="grupo"
        :seleccion="bandeja.seleccion"
        @alternar="bandeja.alternar"
        @alternar-documento="bandeja.alternarDocumento(grupo)"
        @descartar="descartes.pedir"
      />
      <BarraDeSeleccion
        :cantidad="bandeja.elegidas.length"
        :total="bandeja.totalElegido"
        :visibles="bandeja.visibles.length"
        @capitalizar="capitalizacion.abrir(bandeja.elegidas)"
        @quitar="bandeja.limpiar"
        @todas="bandeja.elegirTodas"
      />
    </div>

    <VentanaDeCapitalizar
      :abierta="capitalizacion.abierta"
      :lineas="capitalizacion.lineas"
      :partes="capitalizacion.partes"
      :errores="capitalizacion.errores"
      :catalogos="capitalizacion.catalogos"
      :resumen="capitalizacion.resumen"
      :enviando="capitalizacion.enviando"
      @cerrar="capitalizacion.abierta = false"
      @confirmar="capitalizacion.confirmar"
      @repartir="capitalizacion.repartir"
      @quitar="capitalizacion.quitar"
    />
    <VentanaDeMotivo
      v-model:motivo="descartes.motivo"
      :abierta="descartes.linea !== null"
      titulo="Descartar línea"
      :texto="descartes.texto"
      accion="Descartar línea"
      :errores="descartes.errores"
      :enviando="descartes.enviando"
      @cerrar="descartes.cerrar"
      @confirmar="descartes.confirmar"
    />
  </div>
</template>
