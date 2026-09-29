<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { modulosCliente } from '@/modulos/indice';
import { usarSesion } from '../almacenes/sesion';
import { seccionesDe } from '../secciones/secciones-aportadas';
import type { DondeSeAporta } from '../tipos';
import TarjetaBase from './TarjetaBase.vue';

/** Las secciones que los módulos activos aportan a la ficha de una empresa o de un proveedor (solo lectura). */
const props = defineProps<{ en: DondeSeAporta; registroId: string }>();
const sesion = usarSesion();

const secciones = computed(() =>
  seccionesDe(modulosCliente, props.en, sesion.moduloActivo)
    .filter(({ seccion }) => seccion.ficha)
    .map(({ modulo, seccion }) => ({
      modulo,
      titulo: seccion.titulo,
      componente: defineAsyncComponent(seccion.ficha!),
    })),
);
</script>

<template>
  <TarjetaBase v-for="seccion in secciones" :key="seccion.modulo">
    <h2 class="mb-4 font-semibold text-tierra-800 dark:text-tierra-100">{{ seccion.titulo }}</h2>
    <component :is="seccion.componente" :registro-id="registroId" />
  </TarjetaBase>
</template>
