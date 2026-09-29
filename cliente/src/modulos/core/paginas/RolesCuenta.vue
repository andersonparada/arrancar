<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import BotonBase from '../componentes/BotonBase.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import TarjetaDeRol from '../componentes/roles/TarjetaDeRol.vue';
import VentanaDeRol from '../componentes/roles/VentanaDeRol.vue';
import { resumenDePermisos } from '../composables/roles/edicion-de-rol';
import { usarEdicionDeRol } from '../composables/roles/usar-edicion-de-rol';
import { usarRoles } from '../composables/roles/usar-roles';
import { VENTANAS_CORE } from '../textos';

const { roles, catalogo, cargar, eliminar } = usarRoles();
const { edicion, errores, enviando, abrir, guardar } = usarEdicionDeRol(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.roles.titulo" :descripcion="VENTANAS_CORE.roles.descripcion">
      <BotonBase v-permiso="'roles.crear'" :icono="Plus" @click="abrir()">Nuevo rol</BotonBase>
    </EncabezadoPagina>

    <ul class="grid gap-3 md:grid-cols-2">
      <li v-for="rol in roles" :key="rol.id">
        <TarjetaDeRol :rol="rol" :resumen="resumenDePermisos(rol)" @editar="abrir(rol)" @eliminar="eliminar(rol)" />
      </li>
    </ul>

    <VentanaDeRol
      v-model="edicion"
      :catalogo="catalogo"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
  </div>
</template>
