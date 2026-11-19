<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeCatalogo from '../componentes/compartido/TarjetaDeCatalogo.vue';
import VentanaDeCategoria from '../componentes/categorias/VentanaDeCategoria.vue';
import { detallesDeCategoria } from '../composables/categorias/detalles-de-categoria';
import { usarCategorias } from '../composables/categorias/usar-categorias';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.categorias;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'inventarios.categorias.importar',
  exportar: 'inventarios.categorias.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, eliminar, cambiarEstado } =
  usarCategorias();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'inventarios.categorias.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay categorías" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeCatalogo
          :titulo="registro.nombre"
          :detalles="detallesDeCategoria(registro)"
          :activo="registro.activo"
          permisos="inventarios.categorias"
          @editar="abrir(registro)"
          @eliminar="eliminar(registro)"
          @cambiar-estado="cambiarEstado(registro)"
        />
      </li>
    </ul>

    <VentanaDeCategoria
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar categorías"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
