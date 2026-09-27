<script setup lang="ts">
import { UserPlus, Users } from 'lucide-vue-next';
import BotonBase from '../componentes/BotonBase.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import TarjetaDeUsuario from '../componentes/usuarios/TarjetaDeUsuario.vue';
import VentanaDeContrasena from '../componentes/usuarios/VentanaDeContrasena.vue';
import VentanaDeUsuario from '../componentes/usuarios/VentanaDeUsuario.vue';
import { nombreCompleto } from '../composables/usuarios/edicion-de-usuario';
import { usarCambioDeContrasena } from '../composables/usuarios/usar-cambio-de-contrasena';
import { usarEdicionDeUsuario } from '../composables/usuarios/usar-edicion-de-usuario';
import { usarUsuarios } from '../composables/usuarios/usar-usuarios';
import { VENTANAS_CORE } from '../textos';

const { usuarios, roles, cargando, cargar } = usarUsuarios();
const { edicion, empresas, opcionesRol, esElMismo, errores, enviando, ...ventana } = usarEdicionDeUsuario(
  roles,
  cargar,
);
const contrasena = usarCambioDeContrasena();
const { cambio } = contrasena;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.usuarios.titulo" :descripcion="VENTANAS_CORE.usuarios.descripcion">
      <BotonBase v-permiso="'usuarios.gestionar'" :icono="UserPlus" @click="ventana.abrir()">Nuevo usuario</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!usuarios.length" :icono="Users" titulo="Todavía no hay usuarios" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="usuario in usuarios" :key="usuario.id">
        <TarjetaDeUsuario
          :usuario="usuario"
          :nombre="nombreCompleto(usuario)"
          @editar="ventana.abrir(usuario)"
          @cambiar-contrasena="contrasena.abrir(usuario)"
        />
      </li>
    </ul>

    <VentanaDeUsuario
      v-model="edicion"
      :empresas="empresas"
      :opciones-rol="opcionesRol"
      :es-el-mismo="esElMismo"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="ventana.guardar"
      @escribir-usuario="ventana.escribirUsuario"
    />
    <VentanaDeContrasena
      v-model:contrasena="cambio.contrasena"
      :abierta="cambio.abierta"
      :nombre="cambio.usuario ? nombreCompleto(cambio.usuario) : ''"
      :errores="contrasena.errores.value"
      :enviando="contrasena.enviando.value"
      @cerrar="cambio.abierta = false"
      @guardar="contrasena.guardar"
    />
  </div>
</template>
