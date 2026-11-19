<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeEntrega } from '../composables/fondos/edicion-de-fondo';
import type { ChequeraParaElFondo, CuentaParaElFondo } from '../servicios/catalogos.api';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import CamposDeEntrega from './CamposDeEntrega.vue';

/** Aumentar el monto del fondo: el banco entrega más dinero al custodio. */
defineProps<{
  abierta: boolean;
  enviando: boolean;
  cargando: boolean;
  errores: Record<string, string>;
  chequeras: readonly ChequeraParaElFondo[];
  cuentas: readonly CuentaParaElFondo[];
  fondo: { nombre: string; monto: string; custodio: string | null };
}>();
const edicion = defineModel<EdicionDeEntrega>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Aumentar el fondo" @cerrar="emit('cerrar')">
    <form id="form-de-aumento" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        «{{ fondo.nombre }}» tiene un monto de <strong>{{ formatearMonto(fondo.monto) }}</strong
        >. El monto que escriba se suma a ese monto y sale del banco.
      </p>
      <CamposDeEntrega
        v-model="edicion"
        :chequeras="chequeras"
        :cuentas="cuentas"
        :cargando="cargando"
        :errores="errores"
        :beneficiario-propuesto="fondo.custodio ?? ''"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-aumento" :cargando="enviando">Aumentar</BotonBase>
    </template>
  </VentanaModal>
</template>
