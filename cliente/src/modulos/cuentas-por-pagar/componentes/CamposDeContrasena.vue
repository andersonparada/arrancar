<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { MAXIMO_DE_OBSERVACIONES, type EdicionDeContrasena } from '../composables/contrasenas/edicion-de-contrasena';
import {
  AYUDA_DE_LA_FECHA_DE_LA_CONTRASENA,
  AYUDA_DE_LA_FECHA_DE_PAGO_PROMETIDA,
  AYUDA_DE_OBSERVACIONES_DE_LA_CONTRASENA,
} from '../textos';

/** Los datos propios de la contraseña: proveedor, fecha, fecha prometida de pago y observaciones. */
defineProps<{
  opcionesDeProveedores: { valor: string; texto: string }[];
  errores: Record<string, string>;
  hoy: string;
}>();
const edicion = defineModel<EdicionDeContrasena>({ required: true });
defineEmits<{ escribirFechaDePago: [fecha: string] }>();
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <CampoSelector
      v-model="edicion.proveedorId"
      class="sm:col-span-2"
      etiqueta="Proveedor"
      requerido
      :opciones="opcionesDeProveedores"
      :error="errores.proveedorId"
    />
    <CampoTexto
      v-model="edicion.fecha"
      etiqueta="Fecha de la contraseña"
      tipo="date"
      requerido
      :maximo="hoy"
      :ayuda="AYUDA_DE_LA_FECHA_DE_LA_CONTRASENA"
      :error="errores.fecha"
    />
    <CampoTexto
      :model-value="edicion.fechaDePago"
      etiqueta="Fecha prometida de pago"
      tipo="date"
      requerido
      :ayuda="AYUDA_DE_LA_FECHA_DE_PAGO_PROMETIDA"
      :error="errores.fechaDePago"
      @update:model-value="$emit('escribirFechaDePago', String($event ?? ''))"
    />
    <CampoTexto
      v-model="edicion.observaciones"
      class="sm:col-span-2"
      etiqueta="Observaciones"
      multilinea
      contar
      :longitud-maxima="MAXIMO_DE_OBSERVACIONES"
      :ayuda="AYUDA_DE_OBSERVACIONES_DE_LA_CONTRASENA"
      :error="errores.observaciones"
    />
  </div>
</template>
