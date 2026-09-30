<script setup lang="ts">
import { Fuel, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeCombustible from '../componentes/combustibles/TarjetaDeCombustible.vue';
import VentanaDeCombustible from '../componentes/combustibles/VentanaDeCombustible.vue';
import VentanaDeTasas from '../componentes/vigencias-de-combustible/VentanaDeTasas.vue';
import VentanaDeVigenciaDeCombustible from '../componentes/vigencias-de-combustible/VentanaDeVigenciaDeCombustible.vue';
import { usarCombustibles } from '../composables/combustibles/usar-combustibles';
import { usarTasasDeCombustible } from '../composables/vigencias-de-combustible/usar-vigencias-de-combustible';
import { VENTANAS_LIBRO_DE_COMPRAS } from '../textos';

const ventana = VENTANAS_LIBRO_DE_COMPRAS.combustibles;
const PERMISOS = {
  importar: 'libro-de-compras.combustibles.importar',
  exportar: 'libro-de-compras.combustibles.exportar',
};
const PERMISOS_DE_TASAS = {
  importar: 'libro-de-compras.vigencias-de-combustible.importar',
  exportar: 'libro-de-compras.vigencias-de-combustible.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, cambiarEstado } =
  usarCombustibles();
const tasas = usarTasasDeCombustible();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio :permisos="PERMISOS" @exportar="intercambio.exportar" @importar="intercambio.abrir" />
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_TASAS"
        nombre="tasas de IDP"
        @exportar="tasas.intercambio.exportar"
        @importar="tasas.intercambio.abrir"
      />
      <BotonBase v-permiso="'libro-de-compras.combustibles.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="Fuel"
      titulo="Todavía no hay combustibles"
      descripcion="Registre los combustibles que compra (diésel, gasolina…) y, en cada uno, la tasa de IDP por galón."
    >
      <BotonBase v-permiso="'libro-de-compras.combustibles.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EstadoVacio>
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeCombustible
          :registro="registro"
          :vigente="tasas.vigenteDe(registro.id)"
          :puede-ver-tasas="tasas.puedeVer"
          @editar="abrir(registro)"
          @cambiar-estado="cambiarEstado(registro)"
          @tasas="tasas.abrirTasas(registro)"
        />
      </li>
    </ul>

    <VentanaDeCombustible
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeTasas
      :combustible="tasas.combustible.value?.nombre ?? null"
      :tasas="tasas.tasas.value"
      @cerrar="tasas.cerrar"
      @nueva="tasas.ventana.abrir()"
      @editar="tasas.ventana.abrir"
      @eliminar="tasas.eliminar"
    />
    <VentanaDeVigenciaDeCombustible
      v-model="tasas.ventana.edicion.value"
      :combustible="tasas.combustible.value?.nombre ?? ''"
      :errores="tasas.ventana.errores.value"
      :enviando="tasas.ventana.enviando.value"
      :aviso="tasas.aviso.value"
      @cerrar="tasas.ventana.edicion.value.abierta = false"
      @guardar="tasas.ventana.guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar combustibles"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
    <VentanaDeImportacion
      :estado="tasas.intercambio.estado"
      titulo="Importar tasas de IDP"
      @elegir="tasas.intercambio.elegir"
      @plantilla="tasas.intercambio.bajarPlantilla"
      @importar="tasas.intercambio.importar"
      @cerrar="tasas.intercambio.cerrar"
    />
  </div>
</template>
