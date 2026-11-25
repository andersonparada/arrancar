<script setup lang="ts">
import { Plus, Tags } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeConceptoDeIngreso from '../componentes/conceptos-de-ingreso/TarjetaDeConceptoDeIngreso.vue';
import VentanaDeConceptoDeIngreso from '../componentes/conceptos-de-ingreso/VentanaDeConceptoDeIngreso.vue';
import { usarConceptosDeIngreso } from '../composables/conceptos-de-ingreso/usar-conceptos-de-ingreso';
import { VENTANAS_LIBRO_DE_VENTAS } from '../textos';

const ventana = VENTANAS_LIBRO_DE_VENTAS.conceptosDeIngreso;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'libro-de-ventas.conceptos-de-ingreso.importar',
  exportar: 'libro-de-ventas.conceptos-de-ingreso.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, cambiarEstado, eliminar } =
  usarConceptosDeIngreso();
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
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="Tags"
      titulo="Todavía no hay conceptos de ingreso"
      descripcion="Son los rubros en que se clasifican las ventas: venta de bienes, servicios, venta de ganado o de cosecha… Cree uno o impórtelos desde Excel."
    >
      <BotonBase v-permiso="'libro-de-ventas.conceptos-de-ingreso.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EstadoVacio>
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeConceptoDeIngreso
          :registro="registro"
          @editar="abrir(registro)"
          @eliminar="eliminar(registro)"
          @cambiar-estado="cambiarEstado(registro)"
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
