<script setup lang="ts">
import type { Component } from 'vue';
import { Pencil } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';

/** `detalles` nulo significa que no tiene el papel. */
defineProps<{
  titulo: string;
  icono: Component;
  detalles: { etiqueta: string; valor: string }[] | null;
  puedeGestionar: boolean;
}>();
defineEmits<{ editar: []; quitar: [] }>();
</script>

<template>
  <TarjetaBase>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="flex items-center gap-2 font-semibold">
        <component :is="icono" class="size-4" aria-hidden="true" /> {{ titulo }}
      </h2>
      <div v-if="puedeGestionar" class="flex gap-2">
        <BotonBase variante="secundario" pequeno :icono="Pencil" @click="$emit('editar')">
          {{ detalles ? 'Editar' : 'Asignar' }}
        </BotonBase>
        <BotonBase v-if="detalles" variante="fantasma" pequeno @click="$emit('quitar')">Quitar</BotonBase>
      </div>
    </div>
    <p v-if="!detalles" class="text-sm text-tierra-500">No tiene el papel de {{ titulo.toLowerCase() }}.</p>
    <dl v-else class="grid gap-2 text-sm sm:grid-cols-2">
      <div v-for="detalle in detalles" :key="detalle.etiqueta">
        <dt class="text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd>{{ detalle.valor }}</dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
