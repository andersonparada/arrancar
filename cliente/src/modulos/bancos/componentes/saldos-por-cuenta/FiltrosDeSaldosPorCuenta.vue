<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FiltrosDeSaldos } from '../../composables/saldos-por-cuenta/filtros-de-saldos';

/** La fecha de corte y la cuenta (o todas). */
defineProps<{ opcionesDeCuenta: OpcionDeRegistro[]; errorDeFecha?: string }>();
const filtros = defineModel<FiltrosDeSaldos>({ required: true });
</script>

<template>
  <TarjetaBase>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoTexto v-model="filtros.fecha" etiqueta="Saldos a la fecha" tipo="date" requerido :error="errorDeFecha" />
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDeCuenta" />
    </div>
  </TarjetaBase>
</template>
