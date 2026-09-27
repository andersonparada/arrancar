<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ScrollText } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import { plataformaApi, type EntradaBitacora } from '../servicios/plataforma.api';
import { formatearFechaHora } from '../utilidades/formato';

const avisos = usarAvisos();
const entradas = ref<EntradaBitacora[]>([]);

const ACCIONES: Record<string, string> = { entrada_empresa: 'Entró a la empresa' };

onMounted(async () => {
  try {
    entradas.value = await plataformaApi.bitacora();
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la bitácora.');
  }
});
</script>

<template>
  <div>
    <EncabezadoPagina
      titulo="Bitácora de soporte"
      descripcion="Cada vez que alguien con superacceso entra a una empresa ajena queda registrado aquí."
    />

    <EstadoVacio v-if="!entradas.length" :icono="ScrollText" titulo="Sin registros" />
    <div
      v-else
      class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    >
      <table class="w-full text-left text-sm">
        <thead
          class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700"
        >
          <tr>
            <th class="px-4 py-3 font-medium">Fecha</th>
            <th class="px-4 py-3 font-medium">Usuario</th>
            <th class="px-4 py-3 font-medium">Acción</th>
            <th class="px-4 py-3 font-medium">Empresa</th>
            <th class="px-4 py-3 font-medium">IP</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
          <tr v-for="entrada in entradas" :key="entrada.id">
            <td class="px-4 py-3 whitespace-nowrap">{{ formatearFechaHora(entrada.creadoEn) }}</td>
            <td class="px-4 py-3">{{ entrada.usuarioNombre }}</td>
            <td class="px-4 py-3">{{ ACCIONES[entrada.accion] ?? entrada.accion }}</td>
            <td class="px-4 py-3">{{ entrada.empresaNombre ?? '—' }}</td>
            <td class="px-4 py-3 font-mono text-xs">{{ entrada.direccionIp ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
