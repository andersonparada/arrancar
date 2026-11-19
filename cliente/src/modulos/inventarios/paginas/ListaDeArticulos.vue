<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeArticulo } from '../composables/articulos/detalles-de-articulo';
import { usarListaDeArticulos } from '../composables/articulos/usar-lista-de-articulos';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.articulos;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'inventarios.articulos.importar',
  exportar: 'inventarios.articulos.exportar',
};
const router = useRouter();
const { registros, totalDeArticulos, busqueda, cargando, intercambio } = usarListaDeArticulos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase
        v-permiso="'inventarios.articulos.crear'"
        :icono="Plus"
        @click="router.push({ name: 'inventarios.articulos.nuevo' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <CampoTexto
      v-if="totalDeArticulos"
      v-model="busqueda"
      etiqueta="Buscar"
      tipo="search"
      placeholder="Código, nombre o código de barras"
      class="mb-4 max-w-md"
    />
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!totalDeArticulos"
      :icono="Inbox"
      titulo="Todavía no hay artículos"
      descripcion="Cree el primero con «Nuevo artículo» o impórtelos desde Excel."
    />
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Ningún artículo coincide con la búsqueda" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.codigo)"
          :detalles="detallesDeArticulo(registro)"
          permiso="inventarios.articulos.editar"
          :inactivo="!registro.activo"
          :destino="{ name: 'inventarios.articulos.ficha', params: { articuloId: registro.id } }"
        />
      </li>
    </ul>
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar artículos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
