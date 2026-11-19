<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { sinCerosFinales } from '../../composables/compartido/cantidades';
import type { ConversionDeArticulo } from '../../servicios/articulos.api';

/** Las conversiones del artículo («1 caja = 24 libras»); quien puede editarlo las cambia en una ventana. */
defineProps<{ conversiones: ConversionDeArticulo[]; unidadBase: string | null }>();
const emit = defineEmits<{ cambiar: [] }>();
</script>

<template>
  <section aria-labelledby="conversiones-titulo">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 id="conversiones-titulo" class="font-semibold text-tierra-800 dark:text-tierra-100">Conversiones</h2>
      <BotonBase
        v-permiso="'inventarios.articulos.editar'"
        variante="secundario"
        pequeno
        :icono="Pencil"
        @click="emit('cambiar')"
      >
        Cambiar conversiones
      </BotonBase>
    </div>
    <TarjetaBase>
      <p v-if="!conversiones.length" class="text-sm text-tierra-500">
        Sin conversiones. Las unidades de peso, volumen y longitud se convierten solas; para una caja o un saco, agregue
        cuántas {{ unidadBase ?? 'unidades base' }} trae.
      </p>
      <ul v-else class="space-y-1 text-sm">
        <li v-for="conversion in conversiones" :key="conversion.unidadId">
          1 {{ conversion.unidadNombre }} = {{ sinCerosFinales(conversion.factor) }} {{ unidadBase }}
          <span v-if="conversion.paraCompras" class="text-xs text-tierra-500">(la que propone la compra)</span>
        </li>
      </ul>
    </TarjetaBase>
  </section>
</template>
