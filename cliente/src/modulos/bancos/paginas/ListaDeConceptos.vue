<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import TarjetaDeConcepto from '../componentes/conceptos/TarjetaDeConcepto.vue';
import VentanaDeConcepto from '../componentes/conceptos/VentanaDeConcepto.vue';
import { usarConceptos } from '../composables/conceptos/usar-conceptos';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.conceptos;
const PERMISOS_DE_INTERCAMBIO = { importar: 'bancos.conceptos.importar', exportar: 'bancos.conceptos.exportar' };
const { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, eliminacion, cambiarEstado } =
  usarConceptos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase v-permiso="'bancos.conceptos.gestionar'" :icono="Plus" @click="abrir()">{{ ventana.nuevo }}</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay conceptos" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeConcepto
          :registro="registro"
          @editar="abrir(registro)"
          @eliminar="eliminacion.abrir(registro)"
          @cambiar-estado="cambiarEstado(registro)"
        />
      </li>
    </ul>

    <VentanaDeConcepto
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeMotivo
      v-model:motivo="eliminacion.motivo"
      :abierta="!!eliminacion.registro"
      titulo="Eliminar concepto"
      accion="Eliminar"
      :texto="`¿Eliminar el concepto «${eliminacion.registro?.nombre ?? ''}»? Solo se puede si nadie lo usa; si ya se usó, inactívelo. Queda en la auditoría.`"
      :errores="eliminacion.errores"
      :enviando="eliminacion.enviando"
      @cerrar="eliminacion.cerrar"
      @confirmar="eliminacion.confirmar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar conceptos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
