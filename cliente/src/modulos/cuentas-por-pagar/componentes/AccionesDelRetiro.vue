<script setup lang="ts">
import { Ban, Banknote, HandCoins, Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { sePuedePagarConElRetiro } from '../composables/retiros/ficha-de-retiro';
import type { Retiro } from '../servicios/tipos-de-retiros';

/** Los botones de la ficha: pagar, liquidar, reabrir y anular, solo si el servidor dice que se puede y hay permiso. */
defineProps<{ ficha: Retiro }>();
defineEmits<{ pagar: []; liquidar: []; reabrir: []; anular: [] }>();
</script>

<template>
  <span v-if="sePuedePagarConElRetiro(ficha)" v-permiso="'cuentas-por-pagar.pagos.pagar-en-efectivo'" class="contents">
    <BotonBase :icono="Banknote" @click="$emit('pagar')">Pagar en efectivo</BotonBase>
  </span>
  <span v-if="ficha.puedeLiquidar" v-permiso="'cuentas-por-pagar.retiros.liquidar'" class="contents">
    <BotonBase variante="secundario" :icono="HandCoins" @click="$emit('liquidar')">Liquidar</BotonBase>
  </span>
  <span v-if="ficha.puedeReabrir" v-permiso="'cuentas-por-pagar.retiros.liquidar'" class="contents">
    <BotonBase variante="secundario" :icono="Undo2" @click="$emit('reabrir')">Reabrir</BotonBase>
  </span>
  <span v-if="ficha.puedeAnular" v-permiso="'cuentas-por-pagar.retiros.anular'" class="contents">
    <BotonBase variante="peligro" :icono="Ban" @click="$emit('anular')">Anular</BotonBase>
  </span>
</template>
