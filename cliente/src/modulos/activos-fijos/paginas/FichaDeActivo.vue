<script setup lang="ts">
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EtiquetasDeActivo from '../componentes/activos/EtiquetasDeActivo.vue';
import HistorialDeUbicacion from '../componentes/activos/HistorialDeUbicacion.vue';
import { usarFichaDeActivo } from '../composables/activos/usar-ficha-de-activo';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const props = defineProps<{ activoId: string }>();

const ventana = VENTANAS_ACTIVOS_FIJOS.activos;
const { registro, cargando, detalles, etiquetas } = usarFichaDeActivo(props.activoId);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'activos-fijos.activos' } };
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina
      :titulo="`${registro.codigo} · ${registro.descripcion}`"
      :descripcion="ventana.ficha"
      :volver="volver"
    >
      <EtiquetasDeActivo :etiquetas="etiquetas" />
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detalles" />

    <HistorialDeUbicacion :traslados="registro.traslados" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
</template>
