<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn } from 'lucide-vue-next';
import { usarApariencia } from '../almacenes/apariencia';
import { usarSesion } from '../almacenes/sesion';
import LogoAplicacion from '../componentes/LogoAplicacion.vue';
import BotonBase from '../componentes/BotonBase.vue';
import CampoTexto from '../componentes/CampoTexto.vue';
import { usarFormulario } from '../composables/usar-formulario';

const sesion = usarSesion();
const apariencia = usarApariencia();
const ruta = useRoute();
const router = useRouter();
const { enviando, errores, enviar } = usarFormulario();

const usuario = ref('');
const contrasena = ref('');

async function entrar(): Promise<void> {
  const exito = await enviar(() => sesion.iniciarSesion(usuario.value, contrasena.value));
  if (!exito) return;
  const destino = typeof ruta.query.volver === 'string' && ruta.query.volver.startsWith('/') ? ruta.query.volver : '/';
  await router.replace(destino);
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-linear-to-b from-marca to-marca-oscuro px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex flex-col items-center text-center text-marca-texto">
        <LogoAplicacion class="size-20 drop-shadow" />
        <h1 class="mt-4 text-3xl font-bold tracking-tight">{{ apariencia.nombreAplicacion }}</h1>
        <p class="mt-1 text-sm text-marca-texto/75">Tu rancho y tus siembras, en orden.</p>
      </div>

      <form class="space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-tierra-900" @submit.prevent="entrar">
        <CampoTexto
          v-model="usuario"
          etiqueta="Usuario"
          placeholder="Ej. jlopez"
          autocompletar="username"
          sin-correccion
          requerido
          :error="errores.usuario"
        />
        <CampoTexto
          v-model="contrasena"
          etiqueta="Contraseña"
          tipo="password"
          autocompletar="current-password"
          requerido
          :error="errores.contrasena"
        />
        <BotonBase tipo="submit" :cargando="enviando" :icono="LogIn" class="w-full">Entrar</BotonBase>
      </form>
    </div>
  </main>
</template>
