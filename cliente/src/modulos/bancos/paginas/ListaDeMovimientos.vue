<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeMovimiento from '../componentes/movimientos/VentanaDeMovimiento.vue';
import { detallesDeMovimiento } from '../composables/movimientos/detalles-de-movimiento';
import { usarEliminacionDeMovimiento } from '../composables/movimientos/usar-eliminacion-de-movimiento';
import { usarMovimientos } from '../composables/movimientos/usar-movimientos';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.movimientos;
const PERMISOS_DE_INTERCAMBIO = { importar: 'bancos.movimientos.importar', exportar: 'bancos.movimientos.exportar' };
const { registros, cargando, intercambio, cargar, referencias, edicion, enviando, errores, abrir, guardar } =
  usarMovimientos();
const { eliminar } = usarEliminacionDeMovimiento(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'bancos.movimientos.gestionar'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay movimientos" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.referencia)"
          :detalles="detallesDeMovimiento(registro)"
          permiso="bancos.movimientos.gestionar"
          eliminable
          @eliminar="eliminar(registro)"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeMovimiento
      v-model="edicion"
      :referencias="referencias"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar movimientos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
