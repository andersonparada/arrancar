<script setup lang="ts">
import { ref, useId } from 'vue';
import { ChevronDown, Download } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { detallesDelCuadre, filaDelCuadre } from '../../composables/saldos-iniciales/detalles-de-saldo-inicial';
import type { CuadreDeSaldosIniciales } from '../../servicios/tipos-de-saldos-iniciales';
import { AYUDA_DEL_CUADRE } from '../../textos';

/** El cuadre: los totales generales siempre a la vista, cada uno por separado, y el detalle por proveedor al desplegar. */
defineProps<{ cuadre: CuadreDeSaldosIniciales }>();
const emit = defineEmits<{ exportar: [] }>();
const desplegado = ref(false);
const idDelDetalle = useId();
</script>

<template>
  <TarjetaBase class="mb-6 space-y-3" aria-label="Cuadre de los saldos iniciales" role="region">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">Cuadre de los saldos iniciales</h2>
      <BotonBase
        v-permiso="'cuentas-por-pagar.saldos-iniciales.exportar'"
        variante="secundario"
        pequeno
        :icono="Download"
        @click="emit('exportar')"
      >
        Exportar el cuadre
      </BotonBase>
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-5">
      <div v-for="detalle in detallesDelCuadre(cuadre.general)" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="font-medium break-words">{{ detalle.valor }}</dd>
      </div>
    </dl>
    <p class="text-xs text-tierra-500">{{ AYUDA_DEL_CUADRE }}</p>
    <template v-if="cuadre.proveedores.length > 0">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-campo-700 focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300"
        :aria-expanded="desplegado"
        :aria-controls="idDelDetalle"
        @click="desplegado = !desplegado"
      >
        <ChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': desplegado }" aria-hidden="true" />
        {{ desplegado ? 'Ocultar' : 'Ver' }} el detalle por proveedor ({{ cuadre.proveedores.length }})
      </button>
      <ul v-show="desplegado" :id="idDelDetalle" class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li
          v-for="proveedor in cuadre.proveedores"
          :key="proveedor.proveedorId"
          class="rounded-xl bg-tierra-50 p-3 dark:bg-tierra-800/60"
        >
          <p class="truncate font-semibold">{{ filaDelCuadre(proveedor).titulo }}</p>
          <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div v-for="detalle in filaDelCuadre(proveedor).detalles" :key="detalle.etiqueta" class="min-w-0">
              <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
              <dd class="break-words">{{ detalle.valor }}</dd>
            </div>
          </dl>
        </li>
      </ul>
    </template>
  </TarjetaBase>
</template>
