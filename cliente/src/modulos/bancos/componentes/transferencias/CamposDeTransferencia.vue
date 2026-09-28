<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeTransferencia } from '../../composables/transferencias/edicion-de-transferencia';

/** Los campos de la transferencia: origen, destino (sin la cuenta de origen), fecha, monto, referencia y observaciones. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<'cuentaOrigenId' | 'cuentaDestinoId', OpcionDeRegistro[]>;
}>();
const edicion = defineModel<EdicionDeTransferencia>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.cuentaOrigenId"
      etiqueta="Cuenta de origen"
      :opciones="referencias.cuentaOrigenId"
      requerido
      :error="errores.cuentaOrigenId"
    />
    <CampoSelector
      v-model="edicion.cuentaDestinoId"
      etiqueta="Cuenta de destino"
      :opciones="referencias.cuentaDestinoId"
      requerido
      :error="errores.cuentaDestinoId"
    />
    <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
    <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="any" requerido :error="errores.monto" />
    <CampoTexto
      v-model="edicion.referencia"
      etiqueta="Referencia (boleta o autorización)"
      :error="errores.referencia"
    />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
  </div>
</template>
