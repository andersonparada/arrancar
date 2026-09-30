<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeVigenciaDeCombustible from '../componentes/vigencias-de-combustible/VentanaDeVigenciaDeCombustible.vue';
import { detallesDeVigenciaDeCombustible } from '../composables/vigencias-de-combustible/detalles-de-vigencia-de-combustible';
import { usarEliminacionDeVigenciaDeCombustible } from '../composables/vigencias-de-combustible/usar-eliminacion-de-vigencia-de-combustible';
import { usarVigenciasDeCombustible } from '../composables/vigencias-de-combustible/usar-vigencias-de-combustible';
import { VENTANAS_LIBRO_DE_COMPRAS } from '../textos';

const ventana = VENTANAS_LIBRO_DE_COMPRAS.vigenciasDeCombustible;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'libro-de-compras.vigencias-de-combustible.importar',
  exportar: 'libro-de-compras.vigencias-de-combustible.exportar',
};
const { registros, cargando, intercambio, cargar, referencias, edicion, enviando, errores, abrir, guardar } =
  usarVigenciasDeCombustible();
const { eliminar } = usarEliminacionDeVigenciaDeCombustible(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'libro-de-compras.vigencias-de-combustible.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay vigencias de combustible" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.vigenteDesde)"
          :detalles="detallesDeVigenciaDeCombustible(registro)"
          permiso="libro-de-compras.vigencias-de-combustible.editar"
          eliminable
          permiso-eliminar="libro-de-compras.vigencias-de-combustible.eliminar"
          @eliminar="eliminar(registro)"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeVigenciaDeCombustible
      v-model="edicion"
      :referencias="referencias"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar vigencias de combustible"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
