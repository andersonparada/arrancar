<script setup lang="ts">
import type { Component } from 'vue';
import { Printer } from 'lucide-vue-next';
import type { RouteLocationRaw } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';

/**
 * El esqueleto de las pantallas de impresión: un encabezado con el botón «Imprimir» que no sale en papel, la hoja (en el
 * espacio) cuando hay datos, y un estado vacío que explica qué hacer cuando no existen.
 */
defineProps<{
  titulo: string;
  descripcion: string;
  volver: { texto: string; ruta: RouteLocationRaw };
  /** Hay datos que mostrar en la hoja. */
  listo: boolean;
  cargando: boolean;
  icono: Component;
  mensajeVacio: string;
}>();

const imprimir = (): void => window.print();
</script>

<template>
  <div v-if="listo" class="space-y-4">
    <div class="print:hidden">
      <EncabezadoPagina :titulo="titulo" :descripcion="descripcion" :volver="volver">
        <BotonBase :icono="Printer" @click="imprimir">Imprimir</BotonBase>
      </EncabezadoPagina>
    </div>
    <slot />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando la hoja…</p>
  <EstadoVacio v-else :icono="icono" titulo="No se encontró este documento" :descripcion="mensajeVacio" />
</template>
