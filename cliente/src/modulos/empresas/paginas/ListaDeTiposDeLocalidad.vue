<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeTipoDeLocalidad from '../componentes/tipos-de-localidad/VentanaDeTipoDeLocalidad.vue';
import { detallesDeTipoDeLocalidad } from '../composables/tipos-de-localidad/detalles-de-tipo-de-localidad';
import { usarTiposDeLocalidad } from '../composables/tipos-de-localidad/usar-tipos-de-localidad';
import { VENTANAS_EMPRESAS } from '../textos';

const ventana = VENTANAS_EMPRESAS.tiposDeLocalidad;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'empresas.tipos-de-localidad.importar',
  exportar: 'empresas.tipos-de-localidad.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar } = usarTiposDeLocalidad();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'empresas.tipos-de-localidad.gestionar'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay tipos de localidad" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeTipoDeLocalidad(registro)"
          permiso="empresas.tipos-de-localidad.gestionar"
          :inactivo="!registro.activo"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeTipoDeLocalidad
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar tipos de localidad"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
