<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeDepartamento from '../componentes/departamentos/VentanaDeDepartamento.vue';
import { detallesDeDepartamento } from '../composables/departamentos/detalles-de-departamento';
import { usarDepartamentos } from '../composables/departamentos/usar-departamentos';
import { VENTANAS_EMPRESAS } from '../textos';

const ventana = VENTANAS_EMPRESAS.departamentos;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'empresas.departamentos.importar',
  exportar: 'empresas.departamentos.exportar',
};
const { registros, cargando, intercambio, referencias, edicion, enviando, errores, abrir, guardar } =
  usarDepartamentos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'empresas.departamentos.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay departamentos" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.codigo)"
          :detalles="detallesDeDepartamento(registro)"
          permiso="empresas.departamentos.editar"
          :inactivo="!registro.activo"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeDepartamento
      v-model="edicion"
      :referencias="referencias"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar departamentos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
