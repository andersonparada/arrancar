<script setup lang="ts">
import { computed, defineAsyncComponent, useId } from 'vue';
import { modulosCliente } from '@/modulos/indice';
import { usarSesion } from '../almacenes/sesion';
import { seccionesDe } from '../secciones/secciones-aportadas';
import type { DondeSeAporta } from '../tipos';

/**
 * Las secciones que los módulos activos aportan a la ficha de una empresa o de un proveedor (solo lectura). Cada
 * una pone su título y sus datos con `DatosDelRegistro`, que ya es una tarjeta.
 */
const props = defineProps<{ en: DondeSeAporta; registroId: string }>();
const sesion = usarSesion();
const id = useId();

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
  <section v-for="seccion in secciones" :key="seccion.modulo" :aria-labelledby="`${id}-${seccion.modulo}`">
    <h2 :id="`${id}-${seccion.modulo}`" class="mb-2 font-semibold text-tierra-800 dark:text-tierra-100">
      {{ seccion.titulo }}
    </h2>
    <component :is="seccion.componente" :registro-id="registroId" />
  </section>
</template>
