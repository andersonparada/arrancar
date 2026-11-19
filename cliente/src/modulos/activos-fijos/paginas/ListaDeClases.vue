<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeClase from '../componentes/clases/TarjetaDeClase.vue';
import VentanaDeClase from '../componentes/clases/VentanaDeClase.vue';
import { usarClases } from '../composables/clases/usar-clases';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const ventana = VENTANAS_ACTIVOS_FIJOS.clases;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'activos-fijos.clases.importar',
  exportar: 'activos-fijos.clases.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, eliminar, cambiarEstado } =
  usarClases();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'activos-fijos.clases.crear'" :icono="Plus" @click="abrir()">{{ ventana.nuevo }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="Inbox"
      titulo="Todavía no hay clases de activos"
      descripcion="Cree la primera con «Nueva clase de activo» o impórtelas desde Excel."
    />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeClase
          :registro="registro"
          @editar="abrir(registro)"
          @eliminar="eliminar(registro)"
          @cambiar-estado="cambiarEstado(registro)"
        />
      </li>
    </ul>

    <VentanaDeClase
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar clases de activos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
