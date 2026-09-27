<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { modulosCliente } from '@/modulos/indice';
import { usarSesion } from '../almacenes/sesion';
import { construirMenu } from '../menu/construir-menu';

const sesion = usarSesion();

const saludo = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

/** Las mismas opciones del menú, en tarjetas. */
const accesos = computed(() =>
  construirMenu(modulosCliente, {
    moduloActivo: sesion.moduloActivo,
    puede: sesion.puede,
    esSuperacceso: sesion.esSuperacceso,
  }).flatMap((grupo) => grupo.secciones.flatMap((seccion) => seccion.entradas)),
);
</script>

<template>
  <div>
    <p class="text-sm font-medium text-campo-700 dark:text-campo-300">{{ sesion.empresa?.nombre }}</p>
    <h1 class="text-2xl font-semibold tracking-tight">{{ saludo }}, {{ sesion.usuario?.nombre.split(' ')[0] }}</h1>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">Rol en esta empresa: {{ sesion.rolNombre }}</p>

    <h2 class="mt-8 mb-3 text-sm font-semibold tracking-wider text-tierra-500 uppercase">Accesos rápidos</h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <RouterLink
        v-for="acceso in accesos"
        :key="acceso.ruta"
        :to="acceso.ruta"
        class="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 transition hover:ring-campo-400 dark:bg-tierra-800/60 dark:ring-tierra-700"
      >
        <component :is="acceso.icono" class="size-6 text-campo-700 dark:text-campo-300" aria-hidden="true" />
        <span class="text-sm font-medium">{{ acceso.titulo }}</span>
      </RouterLink>
    </div>
  </div>
</template>
