<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import TarjetaDeEmpresa from '../componentes/TarjetaDeEmpresa.vue';
import VentanaDeEmpresa from '../componentes/VentanaDeEmpresa.vue';
import { usarEmpresas } from '../composables/usar-empresas';
import { VENTANAS_EMPRESAS } from '../textos';

const PERMISOS_DE_INTERCAMBIO = { importar: 'empresas.importar', exportar: 'empresas.exportar' };
const sesion = usarSesion();
const { empresas, intercambio, edicion, enviando, errores, abrir, guardar, cargaInicial } = usarEmpresas();
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_EMPRESAS.empresas.titulo"
      :descripcion="VENTANAS_EMPRESAS.empresas.descripcion(sesion.empresa?.cuentaNombre ?? '')"
    >
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'empresas.crear'" :icono="Plus" @click="abrir()">Nueva empresa</BotonBase>
    </EncabezadoPagina>

    <ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="empresa in empresas" :key="empresa.id">
        <TarjetaDeEmpresa :empresa="empresa" :en-uso="empresa.id === sesion.empresa?.id" />
      </li>
    </ul>

    <VentanaDeEmpresa
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      :carga-inicial="cargaInicial"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar empresas"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
