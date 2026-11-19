<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import HojaDeReposicion from '../componentes/HojaDeReposicion.vue';
import PaginaDeImpresion from '../componentes/PaginaDeImpresion.vue';
import { datosDeLaReposicion, FIRMAS_DE_LA_REPOSICION } from '../composables/impresiones/datos-de-impresion';
import { apiReposiciones } from '../servicios/reposiciones.api';
import type { Reposicion } from '../servicios/tipos-de-reposiciones';

/** La reposición registrada lista para imprimir y firmar: comprobantes por concepto, total y firmas. */
const props = defineProps<{ id: string }>();
const reposicion = usarCarga(
  () => apiReposiciones.obtener(props.id),
  null as Reposicion | null,
  'No se pudo preparar la hoja de reposición.',
);
const volver = (fondoId: string) => ({
  texto: 'Volver al fondo',
  ruta: { name: 'caja-chica.fondos.ficha', params: { id: fondoId } },
});
</script>

<template>
  <PaginaDeImpresion
    :titulo="`Reposición ${reposicion.datos.value?.numero ?? ''}`"
    descripcion="Imprímala y fírmela: quien recibe el dinero, quien revisó y quien autorizó."
    :volver="volver(reposicion.datos.value?.fondoId ?? '')"
    :listo="reposicion.datos.value !== null"
    :cargando="reposicion.cargando.value"
    :icono="RefreshCw"
    mensaje-vacio="No existe o no tiene asignado el fondo. Búsquela desde la ficha del fondo."
  >
    <HojaDeReposicion
      v-if="reposicion.datos.value"
      sello="Reposición de caja chica"
      :titulo="`Reposición de caja chica No. ${reposicion.datos.value.numero}`"
      :datos="datosDeLaReposicion(reposicion.datos.value)"
      :lineas="reposicion.datos.value.lineas"
      :total="reposicion.datos.value.monto"
      :desglose="reposicion.datos.value.desglose"
      :firmas="FIRMAS_DE_LA_REPOSICION"
    />
  </PaginaDeImpresion>
</template>
