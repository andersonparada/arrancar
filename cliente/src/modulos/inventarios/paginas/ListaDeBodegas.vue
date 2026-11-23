<script setup lang="ts">
import { Inbox, Plus, UsersRound } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeAccesosABodegas from '../componentes/bodegas/VentanaDeAccesosABodegas.vue';
import { detallesDeBodega } from '../composables/bodegas/detalles-de-bodega';
import { usarAccesosABodegas } from '../composables/bodegas/usar-accesos-a-bodegas';
import { usarListaDeBodegas } from '../composables/bodegas/usar-lista-de-bodegas';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.bodegas;
const PERMISOS_DE_INTERCAMBIO = { importar: 'inventarios.bodegas.importar', exportar: 'inventarios.bodegas.exportar' };
const router = useRouter();
const { registros, cargando, intercambio } = usarListaDeBodegas();
const accesos = usarAccesosABodegas();
const usuarioId = accesos.usuarioId;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase
        v-permiso="'inventarios.bodegas.asignar'"
        variante="secundario"
        :icono="UsersRound"
        :cargando="accesos.cargando.value"
        @click="accesos.abrir"
      >
        Accesos
      </BotonBase>
      <BotonBase
        v-permiso="'inventarios.bodegas.crear'"
        :icono="Plus"
        @click="router.push({ name: 'inventarios.bodegas.nuevo' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="Inbox"
      titulo="Todavía no hay bodegas"
      descripcion="Cree la primera con «Nueva bodega»; sin una bodega no se puede recibir ni registrar movimientos. Solo ve las bodegas que se le asignaron."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.codigo)"
          :detalles="detallesDeBodega(registro)"
          permiso="inventarios.bodegas.editar"
          :inactivo="!registro.activo"
          :destino="{ name: 'inventarios.bodegas.ficha', params: { bodegaId: registro.id } }"
        />
      </li>
    </ul>
    <VentanaDeAccesosABodegas
      v-model:usuario-id="usuarioId"
      :abierta="accesos.abierta.value"
      :cargando="accesos.cargando.value"
      :enviando="accesos.enviando.value"
      :usuario="accesos.usuario.value"
      :opciones="accesos.opciones.value"
      :bodegas="accesos.bodegas.value"
      :seleccion="accesos.seleccion.value"
      :resumen="accesos.resumen.value"
      :es-propio="accesos.esPropio.value"
      @cerrar="accesos.cerrar"
      @alternar="accesos.alternar"
      @marcar="accesos.marcar"
      @guardar="accesos.guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar bodegas"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
