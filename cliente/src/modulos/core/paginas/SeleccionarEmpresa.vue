<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Building2, ChevronRight, Search } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import { usarSesion } from '../almacenes/sesion';
import EstadoVacio from '../componentes/EstadoVacio.vue';

const sesion = usarSesion();
const avisos = usarAvisos();
const router = useRouter();
const busqueda = ref('');

const empresas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();
  return sesion.empresasDisponibles.filter(
    (e) => !texto || e.nombre.toLowerCase().includes(texto) || e.cuentaNombre.toLowerCase().includes(texto),
  );
});

async function elegir(empresaId: string): Promise<void> {
  try {
    await sesion.cambiarEmpresa(empresaId);
    await router.replace({ name: 'inicio' });
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo abrir la empresa.');
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <h1 class="text-2xl font-semibold tracking-tight">¿Con qué empresa va a trabajar?</h1>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">Puede cambiarla cuando quiera desde el menú.</p>

    <label v-if="sesion.empresasDisponibles.length > 6" class="relative mt-6 block">
      <span class="sr-only">Buscar empresa</span>
      <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tierra-400" aria-hidden="true" />
      <input
        v-model="busqueda"
        type="search"
        placeholder="Buscar por empresa o cuenta"
        class="w-full rounded-lg border-0 bg-white py-2.5 pr-3 pl-9 text-base ring-1 ring-tierra-200 focus:ring-2 focus:ring-campo-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700"
      />
    </label>

    <ul v-if="empresas.length" class="mt-6 space-y-2">
      <li v-for="empresa in empresas" :key="empresa.id">
        <button
          type="button"
          class="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left ring-1 ring-tierra-200 transition hover:ring-campo-400 dark:bg-tierra-800 dark:ring-tierra-700"
          @click="elegir(empresa.id)"
        >
          <span class="flex size-10 items-center justify-center rounded-lg bg-campo-100 text-campo-800 dark:bg-campo-900 dark:text-campo-200">
            <Building2 class="size-5" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ empresa.nombre }}</span>
            <span class="block truncate text-sm text-tierra-500">{{ empresa.cuentaNombre }}</span>
          </span>
          <ChevronRight class="size-5 text-tierra-400" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <EstadoVacio
      v-else
      class="mt-6"
      :icono="Building2"
      titulo="No tiene empresas asignadas"
      descripcion="Pida al dueño de la cuenta que le dé acceso a una empresa."
    />
  </div>
</template>
