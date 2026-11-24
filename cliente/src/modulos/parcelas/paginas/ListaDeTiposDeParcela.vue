<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeTipoDeParcela from '../componentes/tipos-de-parcela/VentanaDeTipoDeParcela.vue';
import { detallesDeTipoDeParcela } from '../composables/tipos-de-parcela/detalles-de-tipo-de-parcela';
import { usarTiposDeParcela } from '../composables/tipos-de-parcela/usar-tipos-de-parcela';
import { VENTANAS_PARCELAS } from '../textos';

const ventana = VENTANAS_PARCELAS.tiposDeParcela;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'parcelas.tipos-de-parcela.importar',
  exportar: 'parcelas.tipos-de-parcela.exportar',
};
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar } = usarTiposDeParcela();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'parcelas.tipos-de-parcela.crear'" :icono="Plus" @click="abrir()">{{
        ventana.nuevo
      }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay tipos de parcela" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeTipoDeParcela(registro)"
          permiso="parcelas.tipos-de-parcela.editar"
          :inactivo="!registro.activo"
          @editar="abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeTipoDeParcela
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar tipos de parcela"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
