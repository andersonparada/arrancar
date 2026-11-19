<script setup lang="ts">
import { HandCoins } from 'lucide-vue-next';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import HojaDeVale from '../componentes/HojaDeVale.vue';
import PaginaDeImpresion from '../componentes/PaginaDeImpresion.vue';
import type { Vale } from '../servicios/tipos-de-vales';
import { apiValesProvisionales } from '../servicios/vales-provisionales.api';

/** El vale provisional listo para imprimir y firmar al entregar el efectivo. */
const props = defineProps<{ id: string }>();
const vale = usarCarga(
  () => apiValesProvisionales.obtener(props.id),
  null as Vale | null,
  'No se pudo preparar la hoja del vale.',
);
const volver = (fondoId: string) => ({
  texto: 'Volver al fondo',
  ruta: { name: 'caja-chica.fondos.ficha', params: { id: fondoId } },
});
</script>

<template>
  <PaginaDeImpresion
    :titulo="`Vale provisional ${vale.datos.value?.numero ?? ''}`"
    descripcion="Imprímalo y pida que lo firme quien recibe el efectivo."
    :volver="volver(vale.datos.value?.fondoId ?? '')"
    :listo="vale.datos.value !== null"
    :cargando="vale.cargando.value"
    :icono="HandCoins"
    mensaje-vacio="No existe o no tiene asignado el fondo. Búsquelo desde la ficha del fondo."
  >
    <HojaDeVale v-if="vale.datos.value" :vale="vale.datos.value" />
  </PaginaDeImpresion>
</template>
