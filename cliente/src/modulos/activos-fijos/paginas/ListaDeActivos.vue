<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import FiltrosDeActivos from '../componentes/activos/FiltrosDeActivos.vue';
import TarjetaDeActivo from '../componentes/activos/TarjetaDeActivo.vue';
import { usarListaDeActivos } from '../composables/activos/usar-lista-de-activos';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const ventana = VENTANAS_ACTIVOS_FIJOS.activos;
const router = useRouter();
const { registros, cargando, filtros, opcionesDeClase } = usarListaDeActivos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase
        v-permiso="'activos-fijos.activos.crear'"
        :icono="Plus"
        @click="router.push({ name: 'activos-fijos.activos.nuevo' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDeActivos v-model="filtros" :opciones-de-clase="opcionesDeClase" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="No hay activos con ese filtro" />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeActivo :registro="registro" />
      </li>
    </ul>
  </div>
</template>
