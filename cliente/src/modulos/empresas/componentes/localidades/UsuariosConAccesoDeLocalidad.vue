<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { UsuarioConAcceso } from '../../servicios/accesos-a-localidades.api';

/** Quiénes tienen acceso a la localidad; se reparten desde «Accesos» en la lista. */
defineProps<{ usuarios: UsuarioConAcceso[]; cargando: boolean }>();
</script>

<template>
  <TarjetaBase>
    <h2 class="font-semibold">Usuarios con acceso</h2>
    <p v-if="cargando" class="mt-2 text-sm text-tierra-500">Cargando…</p>
    <p v-else-if="!usuarios.length" class="mt-2 text-sm text-tierra-500">
      Nadie tiene acceso todavía. Asígnela desde «Accesos» en la lista de localidades. Los usuarios que ven todas las
      localidades por sus permisos no aparecen aquí.
    </p>
    <ul v-else class="mt-2 flex flex-wrap gap-2">
      <li
        v-for="usuario in usuarios"
        :key="usuario.usuarioId"
        class="rounded-full bg-tierra-100 px-3 py-1 text-sm dark:bg-tierra-800"
      >
        {{ usuario.usuario }}
      </li>
    </ul>
  </TarjetaBase>
</template>
