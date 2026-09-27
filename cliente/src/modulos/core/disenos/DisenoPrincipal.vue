<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { LogOut, Menu, X } from 'lucide-vue-next';
import { modulosCliente } from '@/modulos/indice';
import { usarApariencia } from '../almacenes/apariencia';
import { usarSesion } from '../almacenes/sesion';
import LogoAplicacion from '../componentes/LogoAplicacion.vue';
import MenuLateral from '../componentes/MenuLateral.vue';
import SelectorEmpresa from '../componentes/SelectorEmpresa.vue';
import { construirMenu, grupoDeLaRuta } from '../menu/construir-menu';
import { usarGruposAbiertos } from '../menu/usar-grupos-abiertos';

const sesion = usarSesion();
const apariencia = usarApariencia();
const ruta = useRoute();
const router = useRouter();
const menuAbierto = ref(false);

const grupos = computed(() =>
  construirMenu(modulosCliente, {
    moduloActivo: sesion.moduloActivo,
    puede: sesion.puede,
    esSuperacceso: sesion.esSuperacceso,
  }),
);
const { abiertos, alternar } = usarGruposAbiertos(computed(() => grupoDeLaRuta(grupos.value, ruta.path)));

const iniciales = computed(() =>
  (sesion.usuario?.nombre ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase(),
);

watch(
  () => ruta.fullPath,
  () => (menuAbierto.value = false),
);

async function salir(): Promise<void> {
  await sesion.cerrarSesion();
  await router.push({ name: 'iniciar-sesion' });
}
</script>

<template>
  <div class="min-h-dvh lg:pl-72">
    <header
      class="sticky top-0 z-20 flex items-center gap-3 bg-marca px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-marca-texto lg:hidden"
    >
      <button
        type="button"
        class="-ml-1 rounded-lg p-1.5 hover:bg-marca-texto/10"
        aria-label="Abrir menú"
        @click="menuAbierto = true"
      >
        <Menu class="size-6" />
      </button>
      <LogoAplicacion class="size-7" />
      <p class="min-w-0 flex-1 truncate font-semibold">{{ sesion.empresa?.nombre ?? apariencia.nombreAplicacion }}</p>
    </header>

    <div
      v-if="menuAbierto"
      class="fixed inset-0 z-30 bg-tierra-900/50 lg:hidden"
      aria-hidden="true"
      @click="menuAbierto = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-marca text-marca-texto transition-transform lg:translate-x-0"
      :class="menuAbierto ? 'translate-x-0' : '-translate-x-full'"
      aria-label="Menú principal"
    >
      <div class="flex items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <LogoAplicacion class="size-9" />
        <span class="truncate text-lg font-bold tracking-tight">{{ apariencia.nombreAplicacion }}</span>
        <button
          type="button"
          class="ml-auto rounded-lg p-1.5 hover:bg-marca-texto/10 lg:hidden"
          aria-label="Cerrar menú"
          @click="menuAbierto = false"
        >
          <X class="size-5" />
        </button>
      </div>

      <div class="px-4 pb-4">
        <SelectorEmpresa />
      </div>

      <MenuLateral :grupos="grupos" :abiertos="abiertos" @alternar="alternar" />

      <div
        class="flex items-center gap-3 border-t border-marca-texto/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <span
          class="flex size-9 items-center justify-center rounded-full bg-acento text-sm font-bold text-acento-texto"
          >{{ iniciales }}</span
        >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ sesion.usuario?.nombre }}</p>
          <p class="truncate text-xs text-marca-texto/60">{{ sesion.rolNombre ?? 'Sin empresa' }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-marca-texto/75 hover:bg-marca-texto/10 hover:text-marca-texto"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          @click="salir"
        >
          <LogOut class="size-5" />
        </button>
      </div>
    </aside>

    <main class="mx-auto max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8">
      <RouterView :key="sesion.empresa?.id ?? 'sin-empresa'" />
    </main>
  </div>
</template>
