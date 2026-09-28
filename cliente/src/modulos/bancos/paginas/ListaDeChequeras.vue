<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import TarjetaDeChequera from '../componentes/chequeras/TarjetaDeChequera.vue';
import VentanaDeChequera from '../componentes/chequeras/VentanaDeChequera.vue';
import { usarListaDeChequeras } from '../composables/chequeras/usar-lista-de-chequeras';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.chequeras;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'bancos.chequeras.importar',
  exportar: 'bancos.chequeras.exportar',
};
const {
  chequeras,
  cargando,
  cuentaBancariaId,
  opcionesDelFiltro,
  opcionesDeCuenta,
  cambiarEstado,
  intercambio,
  edicion,
  enviando,
  errores,
  nueva,
  guardar,
} = usarListaDeChequeras();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'bancos.chequeras.gestionar'" :icono="Plus" @click="nueva">
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <TarjetaBase class="mb-4">
      <CampoSelector v-model="cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDelFiltro" class="max-w-xs" />
    </TarjetaBase>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!chequeras.length" :icono="Inbox" titulo="Todavía no hay chequeras" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in chequeras" :key="registro.id">
        <TarjetaDeChequera :registro="registro" @cambiar-estado="cambiarEstado(registro)" />
      </li>
    </ul>

    <VentanaDeChequera
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      :opciones-de-cuenta="opcionesDeCuenta.cuentaBancariaId"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar chequeras"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
