<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeBanco from '../componentes/bancos/VentanaDeBanco.vue';
import { detallesDeBanco } from '../composables/bancos/detalles-de-banco';
import { usarBancos } from '../composables/bancos/usar-bancos';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.bancos;
const PERMISOS_DE_INTERCAMBIO = { importar: 'bancos.bancos.importar', exportar: 'bancos.bancos.exportar' };
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar } = usarBancos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'bancos.bancos.gestionar'" :icono="Plus" @click="abrir()">{{ ventana.nuevo }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay bancos" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeBanco(registro)"
          permiso="bancos.bancos.gestionar"
          :inactivo="!registro.activo"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeBanco
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar bancos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
