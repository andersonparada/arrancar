<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeConceptoDeGasto from '../componentes/conceptos-de-gasto/VentanaDeConceptoDeGasto.vue';
import { detallesDeConceptoDeGasto } from '../composables/conceptos-de-gasto/detalles-de-concepto-de-gasto';
import { usarConceptosDeGasto } from '../composables/conceptos-de-gasto/usar-conceptos-de-gasto';
import { VENTANAS_LIBRO_DE_COMPRAS } from '../textos';

const ventana = VENTANAS_LIBRO_DE_COMPRAS.conceptosDeGasto;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'libro-de-compras.conceptos-de-gasto.importar',
  exportar: 'libro-de-compras.conceptos-de-gasto.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar } = usarConceptosDeGasto();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'libro-de-compras.conceptos-de-gasto.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay conceptos de gasto" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeConceptoDeGasto(registro)"
          permiso="libro-de-compras.conceptos-de-gasto.editar"
          :inactivo="!registro.activo"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeConceptoDeGasto
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar conceptos de gasto"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
