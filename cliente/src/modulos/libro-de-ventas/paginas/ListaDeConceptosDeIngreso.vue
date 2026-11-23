<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeConceptoDeIngreso from '../componentes/conceptos-de-ingreso/VentanaDeConceptoDeIngreso.vue';
import { detallesDeConceptoDeIngreso } from '../composables/conceptos-de-ingreso/detalles-de-concepto-de-ingreso';
import { usarConceptosDeIngreso } from '../composables/conceptos-de-ingreso/usar-conceptos-de-ingreso';
import { VENTANAS_LIBRO_DE_VENTAS } from '../textos';

const ventana = VENTANAS_LIBRO_DE_VENTAS.conceptosDeIngreso;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'libro-de-ventas.conceptos-de-ingreso.importar',
  exportar: 'libro-de-ventas.conceptos-de-ingreso.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar } = usarConceptosDeIngreso();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'libro-de-ventas.conceptos-de-ingreso.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay conceptos de ingreso" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeConceptoDeIngreso(registro)"
          permiso="libro-de-ventas.conceptos-de-ingreso.editar"
          :inactivo="!registro.activo"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeConceptoDeIngreso
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar conceptos de ingreso"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
