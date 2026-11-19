<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { Lote } from '../../servicios/articulos.api';

/** Los lotes del artículo, por vencimiento; solo los artículos que manejan lotes pueden registrar uno nuevo. */
defineProps<{ lotes: Lote[]; manejaVencimiento: boolean }>();
const emit = defineEmits<{ registrar: [] }>();
</script>

<template>
  <section aria-labelledby="lotes-titulo">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 id="lotes-titulo" class="font-semibold text-tierra-800 dark:text-tierra-100">Lotes</h2>
      <BotonBase
        v-permiso="'inventarios.articulos.editar'"
        variante="secundario"
        pequeno
        :icono="Plus"
        @click="emit('registrar')"
      >
        Registrar lote
      </BotonBase>
    </div>
    <TarjetaBase>
      <p v-if="!lotes.length" class="text-sm text-tierra-500">Todavía no hay lotes.</p>
      <ul v-else class="divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
        <li v-for="lote in lotes" :key="lote.id" class="flex flex-wrap justify-between gap-2 py-1.5">
          <span class="font-medium">{{ lote.codigo }}</span>
          <span class="text-tierra-600 dark:text-tierra-300">
            <template v-if="manejaVencimiento">Vence {{ formatearFecha(lote.fechaDeVencimiento) }}</template>
            <template v-else-if="lote.fechaDeFabricacion"
              >Fabricado {{ formatearFecha(lote.fechaDeFabricacion) }}</template
            >
          </span>
        </li>
      </ul>
    </TarjetaBase>
  </section>
</template>
