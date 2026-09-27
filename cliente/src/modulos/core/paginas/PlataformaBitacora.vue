<script setup lang="ts">
import { ScrollText } from 'lucide-vue-next';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import { nombreDeLaAccion, usarBitacora } from '../composables/plataforma/usar-bitacora';
import { VENTANAS_CORE } from '../textos';
import { formatearFechaHora } from '../utilidades/formato';

const { entradas } = usarBitacora();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.bitacora.titulo" :descripcion="VENTANAS_CORE.bitacora.descripcion" />

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
            <td class="px-4 py-3">{{ nombreDeLaAccion(entrada.accion) }}</td>
            <td class="px-4 py-3">{{ entrada.empresaNombre ?? '—' }}</td>
            <td class="px-4 py-3 font-mono text-xs">{{ entrada.direccionIp ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
