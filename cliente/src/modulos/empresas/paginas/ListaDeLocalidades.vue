<script setup lang="ts">
import { Inbox, Plus, UsersRound } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import VentanaDeAccesosALocalidades from '../componentes/localidades/VentanaDeAccesosALocalidades.vue';
import { usarAccesosALocalidades } from '../composables/localidades/usar-accesos-a-localidades';
import { detallesDeLocalidad } from '../composables/localidades/detalles-de-localidad';
import { usarListaDeLocalidades } from '../composables/localidades/usar-lista-de-localidades';
import { VENTANAS_EMPRESAS } from '../textos';

const ventana = VENTANAS_EMPRESAS.localidades;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'empresas.localidades.importar',
  exportar: 'empresas.localidades.exportar',
};
const router = useRouter();
const { registros, cargando, nombres, intercambio } = usarListaDeLocalidades();
const accesos = usarAccesosALocalidades();
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
        v-permiso="'empresas.localidades.asignar'"
        variante="secundario"
        :icono="UsersRound"
        :cargando="accesos.cargando.value"
        @click="accesos.abrir"
      >
        Accesos
      </BotonBase>
      <BotonBase
        v-permiso="'empresas.localidades.crear'"
        :icono="Plus"
        @click="router.push({ name: 'empresas.localidades.nuevo' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay localidades" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeLocalidad(registro, nombres)"
          permiso="empresas.localidades.editar"
          :inactivo="!registro.activo"
          :destino="{ name: 'empresas.localidades.ficha', params: { localidadId: registro.id } }"
        />
      </li>
    </ul>
    <VentanaDeAccesosALocalidades
      v-model:usuario-id="usuarioId"
      :abierta="accesos.abierta.value"
      :cargando="accesos.cargando.value"
      :enviando="accesos.enviando.value"
      :usuario="accesos.usuario.value"
      :opciones="accesos.opciones.value"
      :localidades="accesos.localidades.value"
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
      titulo="Importar localidades"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
