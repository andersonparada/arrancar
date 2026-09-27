<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { FiltrosDelListado } from '../composables/usar-listado-de-terceros';

const filtros = defineModel<FiltrosDelListado>({ required: true });

const ESTADOS = [
  { valor: 'true' as const, texto: 'Activos' },
  { valor: 'false' as const, texto: 'Inactivos' },
  { valor: '' as const, texto: 'Todos' },
];
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <CampoTexto
        v-model="filtros.texto"
        class="sm:col-span-2"
        etiqueta="Buscar"
        tipo="search"
        placeholder="Nombre, NIT, DPI o teléfono"
      />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="ESTADOS" />
    </div>
  </TarjetaBase>
</template>
