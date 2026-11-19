<script setup lang="ts">
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeTarjeta } from '../../composables/activos/detalles-de-activo';
import { etiquetasDeActivo } from '../../composables/activos/etiquetas-de-activo';
import type { Activo } from '../../servicios/activos.api';
import EtiquetasDeActivo from './EtiquetasDeActivo.vue';

/** El activo en la lista: lleva a su ficha y muestra sus etiquetas. */
defineProps<{ registro: Activo }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="`${registro.codigo} · ${registro.descripcion}`"
    :detalles="detallesDeTarjeta(registro)"
    permiso="activos-fijos.activos.editar"
    :destino="{ name: 'activos-fijos.activos.ficha', params: { activoId: registro.id } }"
  >
    <template #destacado>
      <EtiquetasDeActivo class="mt-1" :etiquetas="etiquetasDeActivo(registro)" />
    </template>
  </TarjetaDeRegistro>
</template>
