<script setup lang="ts">
import { ClipboardCheck } from 'lucide-vue-next';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import HojaDeArqueo from '../componentes/HojaDeArqueo.vue';
import PaginaDeImpresion from '../componentes/PaginaDeImpresion.vue';
import { apiArqueos } from '../servicios/arqueos.api';
import type { Arqueo } from '../servicios/tipos-de-arqueos';

/** El acta de arqueo lista para imprimir y firmar: conteo, comprobantes, diferencia y las firmas. */
const props = defineProps<{ id: string }>();
const arqueo = usarCarga(
  () => apiArqueos.obtener(props.id),
  null as Arqueo | null,
  'No se pudo preparar el acta de arqueo.',
);
const volver = (fondoId: string) => ({
  texto: 'Volver al fondo',
  ruta: { name: 'caja-chica.fondos.ficha', params: { id: fondoId } },
});
</script>

<template>
  <PaginaDeImpresion
    :titulo="`Acta del arqueo ${arqueo.datos.value?.numero ?? ''}`"
    descripcion="Imprímala y fírmela: quien arqueó, el custodio y quien revisó."
    :volver="volver(arqueo.datos.value?.fondoId ?? '')"
    :listo="arqueo.datos.value !== null"
    :cargando="arqueo.cargando.value"
    :icono="ClipboardCheck"
    mensaje-vacio="No existe o no tiene asignado el fondo. Búsquelo desde la ficha del fondo."
  >
    <HojaDeArqueo v-if="arqueo.datos.value" :arqueo="arqueo.datos.value" />
  </PaginaDeImpresion>
</template>
