<script setup lang="ts">
import { SlidersHorizontal } from 'lucide-vue-next';
import { usarSesion } from '../almacenes/sesion';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import TarjetaDeVariable from '../componentes/configuracion/TarjetaDeVariable.vue';
import { usarConfiguracion } from '../composables/configuracion/usar-configuracion';
import { VENTANAS_CORE } from '../textos';

const sesion = usarSesion();
const { variables, borradores, guardar, restablecer } = usarConfiguracion();
const puedeGestionar = sesion.puede('configuracion.gestionar');
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_CORE.configuracion.titulo"
      :descripcion="VENTANAS_CORE.configuracion.descripcion(sesion.empresa?.nombre ?? '')"
    />

    <EstadoVacio v-if="!variables.length" :icono="SlidersHorizontal" titulo="Sin variables de configuración" />
    <ul v-else class="space-y-3">
      <li v-for="variable in variables" :key="variable.clave">
        <TarjetaDeVariable
          v-model="borradores"
          :variable="variable"
          :puede-gestionar="puedeGestionar"
          @guardar="guardar(variable, $event)"
          @restablecer="restablecer(variable, $event)"
        />
      </li>
    </ul>
  </div>
</template>
