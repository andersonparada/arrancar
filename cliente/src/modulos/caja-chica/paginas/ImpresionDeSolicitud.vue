<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import HojaDeReposicion from '../componentes/HojaDeReposicion.vue';
import PaginaDeImpresion from '../componentes/PaginaDeImpresion.vue';
import { datosDeLaSolicitud, FIRMAS_DE_LA_SOLICITUD } from '../composables/impresiones/datos-de-impresion';
import { lineasDeLosPendientes } from '../composables/reposiciones/impresion-de-reposicion';
import { apiReposiciones } from '../servicios/reposiciones.api';
import type { SolicitudDeReposicion } from '../servicios/tipos-de-reposiciones';

/** La solicitud de reposición: lo pendiente del fondo por concepto, para firmarla antes de pedir el cheque. */
const props = defineProps<{ id: string }>();
const solicitud = usarCarga(
  () => apiReposiciones.solicitud(props.id),
  null as SolicitudDeReposicion | null,
  'No se pudo preparar la solicitud de reposición.',
);
const volver = { texto: 'Volver a reponer', ruta: { name: 'caja-chica.fondos.reponer', params: { id: props.id } } };
</script>

<template>
  <PaginaDeImpresion
    titulo="Solicitud de reposición"
    descripcion="Imprímala para que el custodio la presente y la revisen y autoricen antes de reponer."
    :volver="volver"
    :listo="solicitud.datos.value !== null && solicitud.datos.value.pendientes.length > 0"
    :cargando="solicitud.cargando.value"
    :icono="RefreshCw"
    mensaje-vacio="El fondo no existe, no lo tiene asignado o no tiene comprobantes pendientes de reponer."
  >
    <HojaDeReposicion
      v-if="solicitud.datos.value"
      sello="Solicitud de reposición"
      :titulo="`Solicitud de reposición de ${solicitud.datos.value.fondoNombre}`"
      :datos="datosDeLaSolicitud(solicitud.datos.value, new Date())"
      :lineas="lineasDeLosPendientes(solicitud.datos.value.pendientes)"
      :total="solicitud.datos.value.total"
      :desglose="solicitud.datos.value.desglose"
      :firmas="FIRMAS_DE_LA_SOLICITUD"
    />
  </PaginaDeImpresion>
</template>
