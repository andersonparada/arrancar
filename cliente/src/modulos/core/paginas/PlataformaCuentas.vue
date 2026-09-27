<script setup lang="ts">
import { Building, Plus } from 'lucide-vue-next';
import BotonBase from '../componentes/BotonBase.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import TarjetaDeCuenta from '../componentes/plataforma/TarjetaDeCuenta.vue';
import VentanaDeAltaDeCuenta from '../componentes/plataforma/VentanaDeAltaDeCuenta.vue';
import VentanaDeModulos from '../componentes/plataforma/VentanaDeModulos.vue';
import { usarAltaDeCuenta } from '../composables/plataforma/usar-alta-de-cuenta';
import { usarCuentas } from '../composables/plataforma/usar-cuentas';
import { usarModulosDeCuenta } from '../composables/plataforma/usar-modulos-de-cuenta';
import { VENTANAS_CORE } from '../textos';

const { cuentas, catalogo, cargar, cambiarEstado } = usarCuentas();
const { alta, errores, enviando, abrir, darDeAlta } = usarAltaDeCuenta(cargar);
const modulos = usarModulosDeCuenta();
const { gestion } = modulos;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.cuentas.titulo" :descripcion="VENTANAS_CORE.cuentas.descripcion">
      <BotonBase :icono="Plus" @click="abrir">Nueva cuenta</BotonBase>
    </EncabezadoPagina>

    <EstadoVacio v-if="!cuentas.length" :icono="Building" titulo="Todavía no hay cuentas" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="cuenta in cuentas" :key="cuenta.id">
        <TarjetaDeCuenta :cuenta="cuenta" @modulos="modulos.abrir(cuenta)" @cambiar-estado="cambiarEstado(cuenta)" />
      </li>
    </ul>

    <VentanaDeAltaDeCuenta
      v-model="alta"
      :catalogo="catalogo"
      :errores="errores"
      :enviando="enviando"
      @cerrar="alta.abierta = false"
      @guardar="darDeAlta"
    />
    <VentanaDeModulos
      :abierta="gestion.abierta"
      :cuenta="gestion.cuenta?.nombre ?? ''"
      :modulos="gestion.modulos"
      :enviando="modulos.enviando.value"
      @cerrar="gestion.abierta = false"
      @cambiar="modulos.cambiar"
    />
  </div>
</template>
