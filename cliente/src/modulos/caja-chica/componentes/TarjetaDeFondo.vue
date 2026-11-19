<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeLaTarjeta } from '../composables/fondos/detalles-de-fondo';
import type { FondoResumen } from '../servicios/tipos-de-fondos';

/** Un fondo en la lista: su dinero a la vista y, si el servidor avisa algo (sin arqueo, vale viejo), el aviso. */
defineProps<{ fondo: FondoResumen }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="fondo.nombre"
    :detalles="detallesDeLaTarjeta(fondo)"
    permiso="caja-chica.fondos.ver"
    sin-editar
    :insignia="fondo.aperturaAnulada ? 'Apertura anulada' : fondo.estado === 'cerrado' ? 'Cerrado' : undefined"
    :destino="{ name: 'caja-chica.fondos.ficha', params: { id: fondo.id } }"
  >
    <template v-if="fondo.avisos.length > 0" #destacado>
      <p class="mt-0.5 flex items-start gap-1 text-xs text-tierra-700 dark:text-trigo-300">
        <TriangleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{{
          fondo.avisos.length === 1 ? fondo.avisos[0] : `${fondo.avisos.length} avisos: ${fondo.avisos[0]}`
        }}</span>
      </p>
    </template>
  </TarjetaDeRegistro>
</template>
