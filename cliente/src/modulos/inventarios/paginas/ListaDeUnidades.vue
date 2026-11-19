<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeCatalogo from '../componentes/compartido/TarjetaDeCatalogo.vue';
import VentanaDeUnidad from '../componentes/unidades/VentanaDeUnidad.vue';
import { detallesDeUnidad } from '../composables/unidades/detalles-de-unidad';
import { usarUnidades } from '../composables/unidades/usar-unidades';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.unidades;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'inventarios.unidades.importar',
  exportar: 'inventarios.unidades.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, eliminar, cambiarEstado } =
  usarUnidades();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'inventarios.unidades.crear'" :icono="Plus" @click="abrir()">{{ ventana.nuevo }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="Inbox"
      titulo="Todavía no hay unidades de medida"
      descripcion="Cree la primera con «Nueva unidad de medida» o impórtelas desde Excel."
    />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeCatalogo
          :titulo="registro.nombre"
          :detalles="detallesDeUnidad(registro)"
          :activo="registro.activo"
          permisos="inventarios.unidades"
          @editar="abrir(registro)"
          @eliminar="eliminar(registro)"
          @cambiar-estado="cambiarEstado(registro)"
        />
      </li>
    </ul>

    <VentanaDeUnidad
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar unidades de medida"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
