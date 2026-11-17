<script setup lang="ts">
import type { Conciliacion } from '../../servicios/conciliaciones.api';
import EstadoDeCuentaAdjunto from './EstadoDeCuentaAdjunto.vue';
import SaldoTranscrito from './SaldoTranscrito.vue';
import VisorDeEstadoDeCuenta from './VisorDeEstadoDeCuenta.vue';

/** Lo que se contrasta con el banco: el saldo transcrito, el archivo adjunto y su visor. */
defineProps<{
  conciliacion: Conciliacion;
  direccion: string;
  guardandoSaldo?: boolean;
  errorDelSaldo?: string;
  enviandoArchivo?: boolean;
  errorDelArchivo?: string;
}>();
defineEmits<{ guardarSaldo: [saldo: string | null]; subir: [archivo: File]; quitar: [] }>();
</script>

<template>
  <div class="min-w-0 space-y-4">
    <SaldoTranscrito
      :conciliacion="conciliacion"
      :guardando="guardandoSaldo"
      :error="errorDelSaldo"
      @guardar="$emit('guardarSaldo', $event)"
    />
    <EstadoDeCuentaAdjunto
      :conciliacion="conciliacion"
      :enviando="enviandoArchivo"
      :error="errorDelArchivo"
      @subir="$emit('subir', $event)"
      @quitar="$emit('quitar')"
    />
    <VisorDeEstadoDeCuenta
      v-if="conciliacion.estadoDeCuenta"
      v-permiso="'bancos.conciliaciones.ver'"
      :estado-de-cuenta="conciliacion.estadoDeCuenta"
      :direccion="direccion"
    />
  </div>
</template>
